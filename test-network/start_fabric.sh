#!/bin/bash

# --- CONFIGURATION ---
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=$PWD/../config/
CC_NAME="basic"
CC_SRC_PATH="../asset-transfer-basic/chaincode-go"

# 1. Clean up and Start Network
echo "---------------------------------"
echo ">>> STOPPING OLD NETWORK..."
echo "---------------------------------"
./network.sh down

echo "---------------------------------"
echo ">>> STARTING NEW NETWORK..."
echo "---------------------------------"
./network.sh up createChannel -c mychannel -ca

# 2. Prepare Connection JSON
echo "---------------------------------"
echo ">>> CONFIGURING CONNECTION..."
echo "---------------------------------"
MY_IP=$(ip addr show eth0 | grep "inet\b" | awk '{print $2}' | cut -d/ -f1)
echo "Detected IP: $MY_IP"

cat <<EOF > connection.json
{
  "address": "${MY_IP}:9999",
  "dial_timeout": "10s",
  "tls_required": false
}
EOF

cat <<EOF > metadata.json
{
  "type": "ccaas",
  "label": "${CC_NAME}_1.0"
}
EOF

tar cfz code.tar.gz connection.json
tar cfz basic.tar.gz metadata.json code.tar.gz

# 3. Setup Org1 Environment
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_ADDRESS=localhost:7051

echo "---------------------------------"
echo ">>> INSTALLING CHAINCODE..."
echo "---------------------------------"
peer lifecycle chaincode install basic.tar.gz >&log.txt
PACKAGE_ID=$(grep "identifier" log.txt | awk '{print $NF}')
echo "✅ Package ID: $PACKAGE_ID"

# 4. BUILD & START CHAINCODE SERVER (AUTOMATED)
echo "---------------------------------"
echo ">>> STARTING CHAINCODE SERVER..."
echo "---------------------------------"
# Kill any process on port 9999
fuser -k 9999/tcp 2>/dev/null

echo "Building Go binary..."
(cd ~/fabric-samples/asset-transfer-basic/chaincode-go && /usr/local/go/bin/go build -o basic)

# ... inside start_fabric.sh (the background block)
(
    cd ~/fabric-samples/asset-transfer-basic/chaincode-go
    export CHAINCODE_SERVER_ADDRESS=0.0.0.0:9999
    export CHAINCODE_ID=$PACKAGE_ID
    export CORE_CHAINCODE_ID_NAME=$PACKAGE_ID
    # THIS LINE IS NOW THE ONLY THING TELLING FABRIC NOT TO USE TLS
    export CHAINCODE_TLS_DISABLED=true 
    ./basic > ~/fabric-samples/test-network/chaincode.log 2>&1
) &

echo "⏳ Waiting 10s for background server to stabilize..."
sleep 10

# 5. Approve for Org1
export ORDERER_CA=${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
export ORG1_TLS_ROOT=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt

peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --channelID mychannel --name $CC_NAME --version 1.0 --package-id $PACKAGE_ID --sequence 1 --init-required --signature-policy "OR('Org1MSP.peer')" --tls true --cafile $ORDERER_CA

# 6. Approve for Org2
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
export ORG2_TLS_ROOT=$CORE_PEER_TLS_ROOTCERT_FILE
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_ADDRESS=localhost:9051

peer lifecycle chaincode install basic.tar.gz
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --channelID mychannel --name $CC_NAME --version 1.0 --package-id $PACKAGE_ID --sequence 1 --init-required --signature-policy "OR('Org1MSP.peer')" --tls true --cafile $ORDERER_CA

# 7. Commit
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=$ORG1_TLS_ROOT
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

peer lifecycle chaincode commit -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --channelID mychannel --name $CC_NAME --version 1.0 --sequence 1 --init-required --signature-policy "OR('Org1MSP.peer')" --tls true --cafile $ORDERER_CA --peerAddresses localhost:7051 --tlsRootCertFiles $ORG1_TLS_ROOT --peerAddresses localhost:9051 --tlsRootCertFiles $ORG2_TLS_ROOT

# 8. Init Ledger
echo "---------------------------------"
echo ">>> INITIALIZING LEDGER..."
echo "---------------------------------"
sleep 5
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $ORDERER_CA -C mychannel -n basic --peerAddresses localhost:7051 --tlsRootCertFiles $ORG1_TLS_ROOT --peerAddresses localhost:9051 --tlsRootCertFiles $ORG2_TLS_ROOT --isInit -c '{"function":"InitLedger","Args":[]}'

echo "---------------------------------"
echo ">>> QUERYING CARS..."
echo "---------------------------------"
# Give the ledger 5-10 seconds to finalize the InitLedger status
sleep 10 

# Use the correct function name: QueryAllCars
peer chaincode query -C mychannel -n $CC_NAME -c '{"function":"QueryAllCars","Args":[]}'

echo "✅✅ STARTUP COMPLETE! ✅✅"