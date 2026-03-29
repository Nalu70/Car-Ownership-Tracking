const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const { Gateway, Wallets } = require('fabric-network');
const { registerAndEnrollUser } = require('./registerUser');

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. NODEMAILER CONFIGURATION ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'srirambalu526@gmail.com', 
        pass: 'ylgzuywzwbiausnl'    
    },
    tls: {
        rejectUnauthorized: false
    }
});

// --- 2. FABRIC CONNECTION HELPER ---
async function getContract(userEmail = 'admin') {
    const ccpPath = '/home/sri/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json';
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
    
    const walletPath = path.join(__dirname, 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    let identityToUse = userEmail;
    if (userEmail === 'regulator@gov.in') {
        identityToUse = 'regulator1';
    }

    const identity = await wallet.get(identityToUse);
    if (!identity) {
        console.warn(`⚠️ Identity for ${identityToUse} not found. Falling back to admin.`);
        identityToUse = 'admin'; 
    }

    const gateway = new Gateway();
    await gateway.connect(ccp, {
        wallet,
        identity: identityToUse, 
        discovery: { enabled: true, asLocalhost: true }
    });

    const network = await gateway.getNetwork('mychannel');
    const contract = network.getContract('basic'); 
    
    return { contract, gateway };
}

// --- 3. AUTHENTICATION & APPROVAL ROUTES ---

app.post('/api/register', async (req, res) => {
    const { email, password, role } = req.body;
    let gateway;
    try {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        
        const connection = await getContract('admin');
        gateway = connection.gateway;

        console.log(`Submitting registration request for: ${email}`);
        await connection.contract.submitTransaction('RegisterUserRequest', email.trim().toLowerCase(), passwordHash, role);

        res.status(201).json({ success: true, message: "Request submitted. Pending Regulator approval." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (gateway) await gateway.disconnect();
    }
});

app.post('/api/approve-user', async (req, res) => {
    const { email, role } = req.body;
    let gateway;
    try {
        await registerAndEnrollUser(email, role);

        const connection = await getContract('regulator@gov.in');
        gateway = connection.gateway;
        await connection.contract.submitTransaction('ApproveUser', email.trim().toLowerCase());

        const mailOptions = {
            from: '"Fabric Ledger Authority" <srirambalu526@gmail.com>',
            to: email,
            subject: 'Account Approved',
            html: `<h3>Your Account is Active</h3><p>Your request for <b>${email}</b> has been approved.</p>`
        };
        await transporter.sendMail(mailOptions);

        res.status(200).json({ success: true, message: `User ${email} approved.` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (gateway) await gateway.disconnect();
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    let gateway;
    try {
        const connection = await getContract('admin');
        gateway = connection.gateway;
        const result = await connection.contract.evaluateTransaction('GetUser', email.trim().toLowerCase());
        const user = JSON.parse(result.toString());

        if (user.status !== "Approved") {
            return res.status(403).json({ error: "Account pending approval." });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) return res.status(401).json({ error: "Invalid password." });

        let cleanRole = user.role;
        if (cleanRole === "Private Owner") cleanRole = "Owner";

        res.status(200).json({ 
            success: true, 
            user: { id: user.email, email: user.email, role: cleanRole } 
        });
    } catch (error) {
        res.status(404).json({ error: "User not found." });
    } finally {
        if (gateway) await gateway.disconnect();
    }
});

app.get('/api/pending-users', async (req, res) => {
    let gateway;
    try {
        const connection = await getContract('admin');
        gateway = connection.gateway;
        const result = await connection.contract.evaluateTransaction('GetPendingUsers');
        res.status(200).json(JSON.parse(result.toString()));
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch pending requests" });
    } finally {
        if (gateway) await gateway.disconnect();
    }
});

// Route used by Create.jsx to verify recipient identity and role
app.get('/api/users/:email', async (req, res) => {
    let gateway;
    try {
        const connection = await getContract('admin');
        gateway = connection.gateway;
        
        const email = req.params.email.trim().toLowerCase();
        const result = await connection.contract.evaluateTransaction('GetUser', email);
        const user = JSON.parse(result.toString());

        // Recipient must be an Owner/Private Owner AND be approved
        const isOwnerRole = user.role === "Owner" || user.role === "Private Owner";
        const isApproved = user.status === "Approved";

        if (isOwnerRole && isApproved) {
            res.status(200).json(user);
        } else if (!isOwnerRole) {
            res.status(403).json({ error: `Recipient must be an Owner (User is a ${user.role})` });
        } else {
            res.status(403).json({ error: "Recipient account is not yet approved." });
        }
    } catch (error) {
        res.status(404).json({ error: "Recipient not found on ledger." });
    } finally {
        if (gateway) await gateway.disconnect();
    }
});

// --- 4. LEDGER ROUTES (VEHICLES) ---

app.post('/api/cars', async (req, res) => {
    const { id, make, model, color, ownerName, ownerId, currentUserEmail } = req.body;
    let gateway;
    try {
        const connection = await getContract(currentUserEmail);
        gateway = connection.gateway;

        // Backend pre-verification of recipient role
        const userRes = await connection.contract.evaluateTransaction('GetUser', ownerId.trim().toLowerCase());
        const user = JSON.parse(userRes.toString());
        
        if (user.role !== "Owner" && user.role !== "Private Owner") {
            return res.status(400).json({ error: "Assets can only be minted to Owners." });
        }

        await connection.contract.submitTransaction('CreateCar', id, make, model, color, ownerName, ownerId.trim().toLowerCase());
        res.status(201).json({ message: `Asset ${id} created.` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (gateway) await gateway.disconnect();
    }
});

app.get('/api/cars', async (req, res) => {
    let gateway;
    try {
        const connection = await getContract('admin');
        gateway = connection.gateway;
        const result = await connection.contract.evaluateTransaction('QueryAllCars');
        res.status(200).json(JSON.parse(result.toString()));
    } catch (error) {
        res.status(500).json({ error: "Failed to query ledger" });
    } finally {
        if (gateway) await gateway.disconnect();
    }
});

app.post('/api/cars/change-owner', async (req, res) => {
    const { id, newOwnerName, newOwnerId, currentUserEmail } = req.body;
    let gateway;
    try {
        const connection = await getContract(currentUserEmail);
        gateway = connection.gateway;
        
        // Verify transfer recipient role
        const userResult = await connection.contract.evaluateTransaction('GetUser', newOwnerId.trim().toLowerCase());
        const user = JSON.parse(userResult.toString());
        
        if (user.role !== "Owner" && user.role !== "Private Owner") {
            return res.status(400).json({ error: "Transfer recipient must be an Owner." });
        }
        if (user.status !== 'Approved') {
            return res.status(400).json({ error: "Recipient must be approved to receive vehicles." });
        }

        await connection.contract.submitTransaction('ChangeCarOwner', id, newOwnerName, newOwnerId.trim().toLowerCase());
        res.status(200).json({ success: true, message: "Transfer successful" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (gateway) await gateway.disconnect();
    }
});

app.get('/api/cars/:id/history', async (req, res) => {
    let gateway;
    try {
        const connection = await getContract('admin');
        gateway = connection.gateway;
        const result = await connection.contract.evaluateTransaction('GetCarHistory', req.params.id);
        res.status(200).json(JSON.parse(result.toString()));
    } catch (error) {
        res.status(404).json({ error: "History not found" });
    } finally {
        if (gateway) await gateway.disconnect();
    }
});

// --- 5. START SERVER ---
app.listen(3000, () => {
    console.log(`🚀 Pure Blockchain Bridge Server active on http://localhost:3000`);
});