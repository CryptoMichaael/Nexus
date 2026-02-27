#!/bin/bash
# generate-admin-wallet.sh
# Generate secure BSC Testnet admin wallet

echo "🔐 Generating BSC Testnet Admin Wallet..."
echo ""

# Generate private key (32 bytes = 64 hex chars)
PRIVATE_KEY=$(openssl rand -hex 32)

echo "✅ Private Key Generated:"
echo "0x${PRIVATE_KEY}"
echo ""

# Derive public address using Node.js (requires ethers installed)
PUBLIC_ADDRESS=$(node -e "
const { Wallet } = require('ethers');
const wallet = new Wallet('0x${PRIVATE_KEY}');
console.log(wallet.address);
")

echo "✅ Public Address:"
echo "${PUBLIC_ADDRESS}"
echo ""

# Encrypt private key with AES-256-GCM
echo "🔒 Encrypting private key..."
AES_SECRET=$(openssl rand -base64 32)

ENCRYPTED_KEY=$(node -e "
const { encryptPrivateKey } = require('./dist/utils/secureWallet');
console.log(encryptPrivateKey('0x${PRIVATE_KEY}', '${AES_SECRET}'));
")

echo ""
echo "📝 COPY THESE TO YOUR .env.local FILE:"
echo "=========================================="
echo "TREASURY_WALLET_ADDRESS=${PUBLIC_ADDRESS}"
echo "TREASURY_ENCRYPTED_KEY=${ENCRYPTED_KEY}"
echo "AES_SECRET_KEY=${AES_SECRET}"
echo "=========================================="
echo ""
echo "⚠️  SECURITY WARNINGS:"
echo "1. NEVER commit the AES_SECRET_KEY to git"
echo "2. Store AES_SECRET_KEY in a password manager"
echo "3. Fund this wallet with testnet BNB from: https://testnet.bnbchain.org/faucet-smart"
echo ""
echo "🎯 Next Steps:"
echo "1. Copy the above variables to nexus-backend-prod/.env.local"
echo "2. Get testnet BNB from the faucet"
echo "3. Run: npm run dev"
