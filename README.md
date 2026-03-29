===========================================================================
ASSET TRANSFER (FABRIC-CARS) - BLOCKCHAIN PROVENANCE EXPLORER
===========================================================================
This project implements a Hyperledger Fabric (HLF) network using the 
Chaincode-as-a-Service (CCAAS) model.

---
1. PREREQUISITES
---
- Go Version: 1.22.10+
- Node.js Version: 22.x (Use NVM to install)
- Docker & Docker Compose V2

---
2. SETUP & INSTALLATION
---
1. Download the Project:
   $ git clone https://github.com/Nalu70/Car-Ownership-Tracking.git

2. Prepare Chaincode:
   $ cd ~/asset-transfer-basic/chaincode-go
   $ go mod tidy && go mod vendor

3. Prepare Backend & Identities:
   $ cd ~/fabcar-backend
   $ npm install
   
   # IDENTITY BOOTSTRAP (Crucial Step):
   # Run the following command ONLY ONCE at the very beginning. 
   # This script automatically contacts the CA, enrolls the Admin, 
   # and registers 'admin.id', 'regulator.id', and other roles into 
   # the local wallet for ledger access.
   $ node initWallet.js 

4. Prepare Frontend:
   $ cd ~/fabcar_frontend/fabcar_frontend
   $ npm install

---
3. RUNNING THE NETWORK
---

OPTION A: FRESH START (Wipes old data and starts new)
$ cd ~/test-network
$ ./start_fabric.sh

OPTION B: RESUME NETWORK (Restarts existing containers without wiping data)
$ cd ~/test-network
$ ./resume_fabric.sh

---
4. STARTING THE APPLICATION
---
1. Start API Server:
   # Ensure initWallet.js was already run once before this
   $ cd ~/fabcar-backend
   $ node index.js

2. Start Web UI:
   $ cd ~/fabcar_frontend/fabcar_frontend
   $ npm run dev

---
5. TROUBLESHOOTING
---
- If 'npm run dev' shows "Permission Denied", run: 
  $ chmod -R +x node_modules/.bin
- Ensure 'nvm use 22' is active before starting the frontend.
- Chaincode logs can be found at: ~/test-network/chaincode.log
===========================================================================
