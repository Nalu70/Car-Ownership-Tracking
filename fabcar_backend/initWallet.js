const { Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        const ccpPath = path.resolve(__dirname, '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
        const ca = new FabricCAServices(caInfo.url);

        // 1. Enroll CA Admin
        console.log('Enrolling CA administrator...');
        const enrollment = await ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
        await wallet.put('admin', {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        });
        console.log('✅ CA Admin stored.');

        // 2. Prepare Regulator
        const userId = 'regulator1';
        const userRole = 'Regulator';
        let secret;

        const adminIdentity = await wallet.get('admin');
        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, 'admin');

        try {
            console.log(`Registering ${userId}...`);
            secret = await ca.register({
                affiliation: 'org1.department1',
                enrollmentID: userId,
                role: 'client',
                attrs: [{ name: 'role', value: userRole, ecert: true }]
            }, adminUser);
            console.log(`✅ ${userId} registered successfully.`);
        } catch (regError) {
            // Handle Code 74: Already Registered
            if (regError.message.includes('already registered')) {
                console.log(`ℹ️  ${userId} is already registered on CA. Re-enrolling with default secret...`);
                // Note: In test-network, if you didn't specify a secret, it's often the ID itself or 'userpw'
                // However, usually we use the default password from the first registration.
                // If you don't know the secret, we use 'regulator1pw' as a common practice or just 'userpw'
                secret = 'regulator1pw'; 
            } else {
                throw regError;
            }
        }

        // 3. Enroll the Regulator
        // Note: If you get an "Authentication failure" here, the secret was different.
        // Try 'regulator1pw' or 'userpw'.
        console.log(`Enrolling ${userId}...`);
        const userEnrollment = await ca.enroll({
            enrollmentID: userId,
            enrollmentSecret: secret || 'regulator1pw' 
        });

        await wallet.put(userId, {
            credentials: {
                certificate: userEnrollment.certificate,
                privateKey: userEnrollment.key.toBytes(),
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        });

        console.log(`\n✅ SUCCESS: ${userId} is now in your local wallet.`);
        console.log(`Check the folder: ${walletPath}`);

    } catch (error) {
        console.error(`🛑 Error: ${error.message}`);
        if (error.message.includes('Authentication failure')) {
            console.log('TIP: The user is registered but the password (secret) is wrong.');
            console.log('Run: "docker stop $(docker ps -aq) && docker rm $(docker ps -aq)" and restart your network for a total reset.');
        }
    }
}

main();