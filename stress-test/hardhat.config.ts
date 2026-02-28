import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.19",
  networks: {
    hardhat: {
      forking: process.env.RPC_URL
        ? {
            url: process.env.RPC_URL,
            enabled: process.env.FORK_MODE === "true",
          }
        : undefined,
      chainId: 97,
    },
    bscTestnet: {
      url: process.env.RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545/",
      chainId: 97,
      accounts: process.env.DEPOSITOR0_PRIVATE_KEY ? [process.env.DEPOSITOR0_PRIVATE_KEY] : [],
    },
  },
};

export default config;
