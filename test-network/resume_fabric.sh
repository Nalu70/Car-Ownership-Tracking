#!/bin/bash

# --- CONFIGURATION ---
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=$PWD/../config/
CC_NAME="basic"

# 1. Wake up Containers
echo ">>> WAKING UP CONTAINERS..."
docker start $(docker ps -a -q) 2>/dev/null
sleep 5

# 2. Set Env for Sequence Detection
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_ADDRESS=localhost:7051

# 3. AUTO-DETECT SEQUENCE
echo ">>> DETECTING CURRENT SEQUENCE..."
CURRENT_SEQ=$(peer lifecycle chaincode querycommitted --channelID mychannel --name $CC_NAME | grep -oP 'Sequence: \K\d+')

if [ -z "$CURRENT_SEQ" ]; then
    echo "⚠️ Could not detect sequence. Defaulting to 1."
    SEQ=1
else
    SEQ=$((CURRENT_SEQ + 1))
    echo "📈 Current Sequence: $CURRENT_SEQ. Next Sequence: $SEQ"
fi

# 4. Update IP Configuration
MY_IP=$(ip addr show eth0 | grep "inet\b" | awk '{print $2}' | cut -d/ -f1)
echo "New IP detected: $MY_IP"

cat <<EOF > connection.json
{ "address": "${MY_IP}:9999", "dial_timeout": "10s", "tls_required": false }
EOF
cat <<EOF > metadata.json
{ "type": "ccaas", "label": "${CC_NAME}_1.0" }
EOF
tar cfz code.tar.gz connection.json
tar cfz basic.tar.gz metadata.json code.tar.gz

# 5. Install for updated Package ID
peer lifecycle chaincode install basic.tar.gz >&log.txt
PACKAGE_ID=$(grep "identifier" log.txt | awk '{print $NF}')
echo "New Package ID: $PACKAGE_ID"

# 6. RESTART BACKGROUND SERVER
echo ">>> REBUILDING & RESTARTING CHAINCODE SERVER..."
fuser -k 9999/tcp 2>/dev/null

(cd ~/fabric-samples/asset-transfer-basic/chaincode-go && /usr/local/go/bin/go build -o basic)

(
    cd ~/fabric-samples/asset-transfer-basic/chaincode-go
    export CHAINCODE_SERVER_ADDRESS=0.0.0.0:9999
    export CHAINCODE_ID=$PACKAGE_ID
    export CORE_CHAINCODE_ID_NAME=$PACKAGE_ID
    export CHAINCODE_TLS_DISABLED=true
    ./basic > ~/fabric-samples/test-network/chaincode.log 2>&1
) &

echo "⏳ Waiting for server stability..."
sleep 10

# 7. Approve & Commit for both Orgs
export ORDERER_CA=${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
export ORG1_TLS_ROOT=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt

peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --channelID mychannel --name $CC_NAME --version 1.0 --package-id $PACKAGE_ID --sequence $SEQ --init-required --signature-policy "OR('Org1MSP.peer')" --tls true --cafile $ORDERER_CA

# Switch to Org2
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
export ORG2_TLS_ROOT=$CORE_PEER_TLS_ROOTCERT_FILE
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_ADDRESS=localhost:9051

peer lifecycle chaincode install basic.tar.gz
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --channelID mychannel --name $CC_NAME --version 1.0 --package-id $PACKAGE_ID --sequence $SEQ --init-required --signature-policy "OR('Org1MSP.peer')" --tls true --cafile $ORDERER_CA

# Final Commit
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=$ORG1_TLS_ROOT
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

peer lifecycle chaincode commit -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --channelID mychannel --name $CC_NAME --version 1.0 --sequence $SEQ --init-required --signature-policy "OR('Org1MSP.peer')" --tls true --cafile $ORDERER_CA --peerAddresses localhost:7051 --tlsRootCertFiles $ORG1_TLS_ROOT --peerAddresses localhost:9051 --tlsRootCertFiles $ORG2_TLS_ROOT

echo "✅✅ RESUME COMPLETE! Data is preserved. ✅✅"