# MCP Blockchain Explorer Server

An MCP (Model Context Protocol) server that provides blockchain data tools via explorer APIs. Supports multiple networks simultaneously: Ethereum (Etherscan), Sonic, and Base explorers. Features include checking balances, viewing transaction history, tracking token transfers, fetching contract ABIs, monitoring gas prices, and resolving ENS names (Ethereum only).

## Features

- **Balance Checking**: Get native token balance for any address on the selected network
- **Transaction History**: View recent transactions with detailed information
- **Token Transfers**: Track token transfers with token details
- **Contract ABI**: Fetch smart contract ABIs for development
- **Gas Prices**: Monitor current gas prices (Safe Low, Standard, Fast)
- **ENS Resolution**: Resolve Ethereum addresses to ENS names (Ethereum mainnet only)

## Prerequisites

- Node.js >= 18
- An API key from the explorer (get one at https://etherscan.io/apis, https://explorer.sonic.onerpc.com/apis, or https://basescan.org/apis)

## Installation

1. Clone the repository:
```bash
git clone [your-repo-url]
cd mcp-etherscan-server
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory based on `.env.example`:
```bash
# Copy the example file
cp .env.example .env

# Edit the file with your API keys
nano .env  # or use your preferred editor
```

Your `.env` file should contain API keys for the networks you want to support:
```bash
# Network-specific API keys (preferred approach)
ETHEREUM_API_KEY=your_etherscan_api_key_here
SONIC_API_KEY=your_sonic_explorer_api_key_here
BASE_API_KEY=your_basescan_api_key_here

# Or use a single fallback key for all networks
# ETHERSCAN_API_KEY=your_fallback_api_key_here

# Default network to use when no network is specified
DEFAULT_EXPLORER_NETWORK=ethereum  # Options: ethereum, sonic, base
```

4. Build the project:
```bash
npm run build
```

## Running the Server

Start the server:
```bash
npm start
```

The server will run on stdio, making it compatible with MCP clients like Claude Desktop.

## How It Works

This server implements the Model Context Protocol (MCP) to provide tools for interacting with blockchain data through block explorer APIs (Etherscan, Sonic Explorer, Base Explorer). Each tool is exposed as an MCP endpoint that can be called by compatible clients.

### Available Tools

1. `check-balance`
   - Input: Blockchain address, optional network (ethereum, sonic, base)
   - Output: Native token balance in both Wei and formatted units (ETH/SONIC/etc.)

2. `get-transactions`
   - Input: Blockchain address, optional limit, optional network (ethereum, sonic, base)
   - Output: Recent transactions with timestamps, values, and addresses

3. `get-token-transfers`
   - Input: Blockchain address, optional limit, optional network (ethereum, sonic, base)
   - Output: Recent token transfers with token details

4. `get-contract-abi`
   - Input: Contract address, optional network (ethereum, sonic, base)
   - Output: Contract ABI in JSON format

5. `get-gas-prices`
   - Input: Optional network (ethereum, sonic, base)
   - Output: Current gas prices in Gwei

6. `get-ens-name`
   - Input: Blockchain address, optional network (ethereum only supports ENS)
   - Output: Associated ENS name if available (Ethereum mainnet only)
   
7. `list-supported-networks`
   - Input: None
   - Output: List of all supported blockchain networks with their currency symbols

## Using with Claude Desktop

To add this server to Claude Desktop:

1. Start the server using `npm start`

2. In Claude Desktop:
   - Go to Settings
   - Navigate to the MCP Servers section
   - Click "Add Server"
   - Enter the following configuration:
     ```json
     {
       "name": "Blockchain Explorer Tools",
       "transport": "stdio",
       "command": "node /path/to/mcp-blockchain-explorer-server/build/index.js"
     }
     ```
   - Save the configuration

3. The blockchain explorer tools will now be available in your Claude conversations

### Example Usage in Claude

You can use commands like:
```
Check the balance of 0x742d35Cc6634C0532925a3b844Bc454e4438f44e on Ethereum
```
or
```
Show me recent transactions for vitalik.eth
```
or
```
What are the current gas prices on Base?
```

You can specify which network to use in your queries:
```
Get the token transfers for 0x742d35Cc6634C0532925a3b844Bc454e4438f44e on Sonic network
```
or
```
Check current gas prices on Base
```

You can also list all supported networks and get information about them:
```
What blockchain networks do you support?
```
or
```
List all supported blockchain networks
```

## Development

To add new features or modify existing ones:

1. The main server logic is in `src/server.ts`
2. Explorer API interactions are handled in `src/services/etherscanService.ts`
3. Add support for more networks by extending the `NETWORK_CONFIGS` in `src/services/etherscanService.ts`
4. Build after changes: `npm run build`

## License

MIT License - See LICENSE file for details 