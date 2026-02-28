import { ethers, Contract, Wallet } from "ethers";

/**
 * Protocol ABI Wrapper
 * TODO: Update method names to match your actual protocol contract ABI
 */

export class ProtocolWrapper {
  private contract: Contract;

  constructor(contractAddress: string, signer: Wallet) {
    // TODO: Replace with your actual protocol ABI
    const protocolABI = [
      // Read methods
      "function balanceOf(address) view returns (uint256)",
      "function deposits(address) view returns (uint256)",
      "function earned(address) view returns (uint256)",
      "function getRank(address) view returns (uint8)",
      
      // Write methods - TODO: Map to your actual method names
      "function deposit(uint256 amount) external",
      "function deposit(uint256 amount, address referrer) external",
      "function claim() external returns (uint256)",
      "function withdraw(uint256 amount) external returns (uint256)",
      "function harvest() external returns (uint256)",
      
      // Referral methods - TODO: Map to your actual method names
      "function registerReferrer(address referrer) external",
      "function getReferrer(address user) view returns (address)",
      
      // Events
      "event Deposit(address indexed user, uint256 amount, address indexed referrer)",
      "event Claim(address indexed user, uint256 amount)",
      "event ReferralRegistered(address indexed user, address indexed referrer)",
    ];

    this.contract = new ethers.Contract(contractAddress, protocolABI, signer);
  }

  // Read methods
  async getDeposit(address: string): Promise<ethers.BigNumber> {
    try {
      return await this.contract.deposits(address);
    } catch {
      return ethers.BigNumber.from(0);
    }
  }

  async getEarned(address: string): Promise<ethers.BigNumber> {
    try {
      return await this.contract.earned(address);
    } catch {
      return ethers.BigNumber.from(0);
    }
  }

  async getRank(address: string): Promise<number> {
    try {
      return await this.contract.getRank(address);
    } catch {
      return 0;
    }
  }

  async getReferrer(address: string): Promise<string> {
    try {
      return await this.contract.getReferrer(address);
    } catch {
      return ethers.constants.AddressZero;
    }
  }

  // Write methods - TODO: Adjust based on your protocol's actual signature
  async registerReferrer(referrer: string): Promise<ethers.ContractTransaction> {
    // TODO: If your protocol doesn't have explicit registerReferrer, comment this out
    return await this.contract.registerReferrer(referrer);
  }

  async deposit(amount: ethers.BigNumber, referrer?: string): Promise<ethers.ContractTransaction> {
    // TODO: Adjust based on whether your protocol:
    // A) Has deposit(amount, referrer) signature
    // B) Has only deposit(amount) and requires prior registerReferrer call
    if (referrer && referrer !== ethers.constants.AddressZero) {
      try {
        return await this.contract["deposit(uint256,address)"](amount, referrer);
      } catch {
        // Fallback to deposit without referrer
        return await this.contract["deposit(uint256)"](amount);
      }
    }
    return await this.contract["deposit(uint256)"](amount);
  }

  async claim(): Promise<ethers.ContractTransaction> {
    // TODO: Map to your actual claim/withdraw/harvest method name
    try {
      return await this.contract.claim();
    } catch {
      try {
        return await this.contract.harvest();
      } catch {
        return await this.contract.withdraw(0); // withdraw(0) might trigger claim
      }
    }
  }

  withSigner(signer: Wallet): ProtocolWrapper {
    const newInstance = Object.create(ProtocolWrapper.prototype);
    newInstance.contract = this.contract.connect(signer);
    return newInstance;
  }
}

export class USDTWrapper {
  private contract: Contract;

  constructor(tokenAddress: string, signer: Wallet) {
    const erc20ABI = [
      "function balanceOf(address) view returns (uint256)",
      "function transfer(address to, uint256 amount) external returns (bool)",
      "function approve(address spender, uint256 amount) external returns (bool)",
      "function allowance(address owner, address spender) view returns (uint256)",
      "function decimals() view returns (uint8)",
    ];

    this.contract = new ethers.Contract(tokenAddress, erc20ABI, signer);
  }

  async balanceOf(address: string): Promise<ethers.BigNumber> {
    return await this.contract.balanceOf(address);
  }

  async transfer(to: string, amount: ethers.BigNumber): Promise<ethers.ContractTransaction> {
    return await this.contract.transfer(to, amount);
  }

  async approve(spender: string, amount: ethers.BigNumber): Promise<ethers.ContractTransaction> {
    return await this.contract.approve(spender, amount);
  }

  async allowance(owner: string, spender: string): Promise<ethers.BigNumber> {
    return await this.contract.allowance(owner, spender);
  }

  async decimals(): Promise<number> {
    return await this.contract.decimals();
  }

  withSigner(signer: Wallet): USDTWrapper {
    const newInstance = Object.create(USDTWrapper.prototype);
    newInstance.contract = this.contract.connect(signer);
    return newInstance;
  }
}
