/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const fs = require('fs');
const path = require('path');

/**
 * registerAndEnrollUser
 * @param {string} userId - This will be the user's Email ID
 * @param {string} userRole - 'Dealer', 'Owner', or 'Regulator'
 */
async function registerAndEnrollUser(userId, userRole) {
    try {
        // 1. Load connection profile
        const ccpPath = path.resolve(__dirname, '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // 2. Create a new CA client
        const caURL = ccp.certificateAuthorities['ca.org1.example.com'].url;
        const ca = new FabricCAServices(caURL);

        // 3. Create a new file system based wallet
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // 4. Check if user already exists
        const userIdentity = await wallet.get(userId);
        if (userIdentity) {
            console.log(`An identity for the user "${userId}" already exists in the wallet`);
            return true;
        }

        // 5. Check if admin exists
        const adminIdentity = await wallet.get('admin');
        if (!adminIdentity) {
            throw new Error('An identity for the admin user "admin" does not exist in the wallet. Run enrollAdmin.js first.');
        }

        // 6. Build a user object for authenticating with the CA
        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, 'admin');

        // 7. Register the user with Attributes
        // The 'ecert: true' tells the CA to include this attribute in the enrollment certificate
        const secret = await ca.register({
            affiliation: 'org1.department1',
            enrollmentID: userId,
            role: 'client',
            attrs: [{
                name: 'role',
                value: userRole,
                ecert: true
            }]
        }, adminUser);

        // 8. Enroll the user
        // IMPORTANT: We must explicitly ask for the 'role' attribute during enrollment
        const enrollment = await ca.enroll({
            enrollmentID: userId,
            enrollmentSecret: secret,
            attr_reqs: [{
                name: 'role',
                optional: false
            }]
        });

        // 9. Prepare the X.509 Identity
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };

        // 10. Save the .id file in the wallet
        await wallet.put(userId, x509Identity);
        console.log(`✅ Successfully enrolled identity: ${userId} with role: ${userRole}`);
        return true;

    } catch (error) {
        console.error(`❌ Failed to register user "${userId}": ${error}`);
        throw error;
    }
}

// Export the function so index.js can use it
module.exports = { registerAndEnrollUser };

// CLI Support
if (require.main === module) {
    const args = process.argv.slice(2);
    const userId = args[0] || 'regulator@gov.in';
    const role = args[1] || 'Regulator';
    
    registerAndEnrollUser(userId, role).then(() => {
        console.log("Registration process complete.");
    }).catch((err) => {
        console.error(err);
        process.exit(1);
    });
}