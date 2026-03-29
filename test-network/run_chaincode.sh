#!/bin/bash
cd ~/fabric-samples/asset-transfer-basic/chaincode-go
echo ">>> Rebuilding binary..."
/usr/local/go/bin/go build -o basic
export CHAINCODE_SERVER_ADDRESS=0.0.0.0:9999
export CHAINCODE_ID=basic_1.0:8f53b3475754811914b0f3fe16fa6f8fa549f28dfe1fd8c8ab05c994ebe36822
export CORE_CHAINCODE_ID_NAME=$CHAINCODE_ID
echo ">>> STARTING SERVER (ID: basic_1.0:8f53b3475754811914b0f3fe16fa6f8fa549f28dfe1fd8c8ab05c994ebe36822)"
./basic
