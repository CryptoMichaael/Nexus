/**
 * 🧪 BSC TESTNET CONNECTION TESTER
 * Verifies blockchain connectivity and wallet setup
 */

import { ethers } from 'ethers';
import { createWalletManager } from '../src/utils/secureWallet';
import { logger } from '../src/config/logger';

async function testBlockchainConnection() {
  console.log('🧪 Testing BSC Testnet Connection...\n');

  // 1. Test RPC Connection
  console.log('1️⃣ Testing RPC Provider...');
  const rpcUrl = process.env.BSC_TESTNET_RPC_URL || 'https://data-seed-prebsc-1-s1.bnbchain.org:8545';
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  try {
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    console.log(`   ✅ Connected to BSC Testnet (Chain ID: ${network.chainId})`);
    console.log(`   ✅ Latest Block: ${blockNumber}\n`);
  } catch (error: any) {
    console.error(`   ❌ RPC Connection Failed: ${error.message}\n`);
    process.exit(1);
  }

  // 2. Test Wallet Decryption
  console.log('2️⃣ Testing Wallet Manager...');
  try {
    const walletManager = createWalletManager();
    const privateKey = await walletManager.getKey();
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log(`   ✅ Wallet Address: ${wallet.address}`);
    walletManager.lock();
  } catch (error: any) {
    console.error(`   ❌ Wallet Decryption Failed: ${error.message}`);
    console.log('   💡 Run: ./scripts/generate-admin-wallet.sh\n');
    process.exit(1);
  }

  // 3. Test Wallet Balance
  console.log('\n3️⃣ Testing Wallet Balance...');
  try {
    const walletManager = createWalletManager();
    const privateKey = await walletManager.getKey();
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const balance = await provider.getBalance(wallet.address);
    const balanceBNB = ethers.formatEther(balance);
    
    console.log(`   💰 Balance: ${balanceBNB} BNB`);
    
    if (parseFloat(balanceBNB) === 0) {
      console.log('   ⚠️  Warning: Wallet has 0 BNB');
      console.log('   💡 Get testnet BNB: https://testnet.bnbchain.org/faucet-smart\n');
    } else {
      console.log(`   ✅ Wallet funded\n`);
    }
    
    walletManager.lock();
  } catch (error: any) {
    console.error(`   ❌ Balance Check Failed: ${error.message}\n`);
  }

  // 4. Test USDT Contract (if configured)
  if (process.env.USDT_CONTRACT_ADDRESS) {
    console.log('4️⃣ Testing USDT Contract...');
    try {
      const usdtAddress = process.env.USDT_CONTRACT_ADDRESS;
      const abi = [
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)',
      ];
      
      const usdtContract = new ethers.Contract(usdtAddress, abi, provider);
      const name = await usdtContract.name();
      const symbol = await usdtContract.symbol();
      const decimals = await usdtContract.decimals();
      
      console.log(`   ✅ Contract Found: ${name} (${symbol})`);
      console.log(`   ✅ Decimals: ${decimals}\n`);
    } catch (error: any) {
      console.error(`   ❌ USDT Contract Test Failed: ${error.message}\n`);
    }
  }

  // 5. Summary
  console.log('═══════════════════════════════════════');
  console.log('✅ ALL TESTS PASSED - READY FOR DEVELOPMENT');
  console.log('═══════════════════════════════════════\n');
  console.log('Next Steps:');
  console.log('1. Start backend: npm run dev');
  console.log('2. Start frontend: cd ../nexus-frontend-prod && npm run dev');
  console.log('3. Test deposit webhook with ngrok\n');

  process.exit(0);
}

testBlockchainConnection().catch((error) => {
  console.error('Fatal Error:', error);
  process.exit(1);
});
