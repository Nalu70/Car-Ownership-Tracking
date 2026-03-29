package main

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/hyperledger/fabric-chaincode-go/v2/shim"
	"github.com/hyperledger/fabric-chaincode-go/v2/pkg/cid"
	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

// SmartContract provides functions for managing Cars and Users
type SmartContract struct {
	contractapi.Contract
}

// Car describes basic details of what makes up a car
type Car struct {
	ID      string `json:"id"`
	Make    string `json:"make"`
	Model   string `json:"model"`
	Color   string `json:"color"`
	Owner   string `json:"ownerName"`
	OwnerID string `json:"ownerId"`
}

// User describes the details for login authentication on-chain
type User struct {
	Email        string `json:"email"`
	PasswordHash string `json:"passwordHash"`
	Role         string `json:"role"`
	Status       string `json:"status"` // "Pending" or "Approved"
	OTP          string `json:"otp"`
	OTPExpiry    int64  `json:"otpExpiry"`
}

// HistoryQueryResult used for returning results of a history query
type HistoryQueryResult struct {
	Record    *Car      `json:"record"`
	TxId      string    `json:"txId"`
	Timestamp time.Time `json:"timestamp"`
	IsDelete  bool      `json:"isDelete"`
}

func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	fmt.Println("Initializing the ledger... No default data added.")
	return nil
}

// --- USER MANAGEMENT FUNCTIONS ---

func (s *SmartContract) RegisterUserRequest(ctx contractapi.TransactionContextInterface, email string, passwordHash string, role string) error {
	exists, err := s.UserExists(ctx, email)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("user with email %s already exists", email)
	}

	user := User{
		Email:        email,
		PasswordHash: passwordHash,
		Role:         role,
		Status:       "Pending",
	}

	userJSON, err := json.Marshal(user)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState("USER_"+email, userJSON)
}

func (s *SmartContract) ApproveUser(ctx contractapi.TransactionContextInterface, email string) error {
	clientRole, found, err := cid.GetAttributeValue(ctx.GetStub(), "role")
	if err != nil || !found || clientRole != "Regulator" {
		return fmt.Errorf("unauthorized: only a Regulator can approve users")
	}

	user, err := s.GetUser(ctx, email)
	if err != nil {
		return err
	}

	user.Status = "Approved"
	userJSON, err := json.Marshal(user)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState("USER_"+email, userJSON)
}

func (s *SmartContract) GetUser(ctx contractapi.TransactionContextInterface, email string) (*User, error) {
	userJSON, err := ctx.GetStub().GetState("USER_" + email)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if userJSON == nil {
		return nil, fmt.Errorf("user %s does not exist", email)
	}

	var user User
	err = json.Unmarshal(userJSON, &user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// --- CAR MANAGEMENT FUNCTIONS ---

func (s *SmartContract) CreateCar(ctx contractapi.TransactionContextInterface, id string, make string, model string, color string, ownerName string, ownerId string) error {
	clientRole, found, err := cid.GetAttributeValue(ctx.GetStub(), "role")
	if err != nil || !found || clientRole != "Dealer" {
		return fmt.Errorf("unauthorized: only a Dealer can mint new assets")
	}

	user, err := s.GetUser(ctx, ownerId)
	if err != nil {
		return fmt.Errorf("recipient lookup failed: user %s not found on ledger", ownerId)
	}

	if user.Role != "Owner" && user.Role != "Private Owner" {
		return fmt.Errorf("invalid recipient: assets can only be minted to an Owner, recipient is a %s", user.Role)
	}

	if user.Status != "Approved" {
		return fmt.Errorf("recipient %s is not yet approved", ownerId)
	}

	exists, err := s.CarExists(ctx, id)
	if err != nil || exists {
		return fmt.Errorf("the car %s already exists", id)
	}

	car := Car{
		ID:      id,
		Make:    make,
		Model:   model,
		Color:   color,
		Owner:   ownerName,
		OwnerID: ownerId,
	}
	carJSON, _ := json.Marshal(car)

	return ctx.GetStub().PutState(id, carJSON)
}

func (s *SmartContract) ChangeCarOwner(ctx contractapi.TransactionContextInterface, id string, newOwnerName string, newOwnerId string) error {
	car, err := s.QueryCar(ctx, id)
	if err != nil {
		return err
	}

	user, err := s.GetUser(ctx, newOwnerId)
	if err != nil {
		return fmt.Errorf("new owner not found")
	}

	if user.Role != "Owner" && user.Role != "Private Owner" {
		return fmt.Errorf("transfer failed: recipient must be an Owner")
	}
	if user.Status != "Approved" {
		return fmt.Errorf("transfer failed: recipient is not approved")
	}

	car.Owner = newOwnerName
	car.OwnerID = newOwnerId

	carJSON, _ := json.Marshal(car)
	return ctx.GetStub().PutState(id, carJSON)
}

// --- HELPER & QUERY FUNCTIONS ---

func (s *SmartContract) QueryCar(ctx contractapi.TransactionContextInterface, id string) (*Car, error) {
	carJSON, err := ctx.GetStub().GetState(id)
	if err != nil || carJSON == nil {
		return nil, fmt.Errorf("the car %s does not exist", id)
	}

	var car Car
	json.Unmarshal(carJSON, &car)
	return &car, nil
}

func (s *SmartContract) QueryAllCars(ctx contractapi.TransactionContextInterface) ([]Car, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var cars []Car
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		key := queryResponse.Key
		if len(key) >= 5 && key[0:5] == "USER_" {
			continue
		}

		var car Car
		err = json.Unmarshal(queryResponse.Value, &car)
		if err == nil && car.ID != "" {
			cars = append(cars, car)
		}
	}
	return cars, nil
}

func (s *SmartContract) GetPendingUsers(ctx contractapi.TransactionContextInterface) ([]*User, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("USER_", "USER_\uffff")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var pendingUsers []*User
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var user User
		json.Unmarshal(queryResponse.Value, &user)
		if user.Status == "Pending" {
			pendingUsers = append(pendingUsers, &user)
		}
	}
	return pendingUsers, nil
}

func (s *SmartContract) CarExists(ctx contractapi.TransactionContextInterface, id string) (bool, error) {
	carJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return false, err
	}
	return carJSON != nil, nil
}

func (s *SmartContract) UserExists(ctx contractapi.TransactionContextInterface, email string) (bool, error) {
	userJSON, err := ctx.GetStub().GetState("USER_" + email)
	if err != nil {
		return false, err
	}
	return userJSON != nil, nil
}

func (s *SmartContract) GetCarHistory(ctx contractapi.TransactionContextInterface, id string) ([]HistoryQueryResult, error) {
	resultsIterator, err := ctx.GetStub().GetHistoryForKey(id)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var records []HistoryQueryResult
	for resultsIterator.HasNext() {
		response, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var car Car
		if len(response.Value) > 0 {
			json.Unmarshal(response.Value, &car)
		} else {
			car = Car{ID: id, Owner: "N/A"}
		}

		records = append(records, HistoryQueryResult{
			TxId:      response.TxId,
			Timestamp: response.Timestamp.AsTime(),
			Record:    &car,
			IsDelete:  response.IsDelete,
		})
	}
	return records, nil
}

// --- AUTH HELPERS ---

func (s *SmartContract) SetUserOTP(ctx contractapi.TransactionContextInterface, email string, otp string, expiry int64) error {
	user, err := s.GetUser(ctx, email)
	if err != nil {
		return err
	}
	user.OTP = otp
	user.OTPExpiry = expiry
	userJSON, _ := json.Marshal(user)
	return ctx.GetStub().PutState("USER_"+email, userJSON)
}

func (s *SmartContract) ResetPassword(ctx contractapi.TransactionContextInterface, email string, otp string, newPasswordHash string) error {
	user, err := s.GetUser(ctx, email)
	if err != nil {
		return err
	}
	if user.OTP != otp {
		return fmt.Errorf("invalid OTP")
	}
	txTimestamp, _ := ctx.GetStub().GetTxTimestamp()
	if txTimestamp.Seconds > user.OTPExpiry {
		return fmt.Errorf("OTP has expired")
	}
	user.PasswordHash = newPasswordHash
	user.OTP = ""
	user.OTPExpiry = 0
	userJSON, _ := json.Marshal(user)
	return ctx.GetStub().PutState("USER_"+email, userJSON)
}

// --- MAIN FUNCTION ---

func main() {
	// 1. Create the contract
	carSmartContract := new(SmartContract)

	// 2. Create the chaincode
	cc, err := contractapi.NewChaincode(carSmartContract)
	if err != nil {
		fmt.Printf("Error creating car smart contract: %s", err)
		return
	}

	// 3. Launch using the shim.ChaincodeServer
	// In v2.x, the struct field is TLSProps, but the type is shim.TLSProperties
	server := &shim.ChaincodeServer{
		CCID:    os.Getenv("CHAINCODE_ID"),
		Address: os.Getenv("CHAINCODE_SERVER_ADDRESS"),
		CC:      cc,
		TLSProps: shim.TLSProperties{ // <--- CHANGED THIS FROM TLSProps to TLSProperties
			Disabled: true,
		},
	}

	// 4. Start
	if err := server.Start(); err != nil {
		fmt.Printf("Error starting chaincode: %s", err)
	}
}