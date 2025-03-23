# Figma-Cursor-MCP Project Context

This project is a Model Context Protocol (MCP) integration between Cursor AI and Figma, enabling AI-driven design through natural language commands.

## Project Structure
- `src/talk_to_figma_mcp/`: TypeScript MCP server implementation
- `src/cursor_mcp_plugin/`: Figma plugin implementation
- `src/socket.ts`: WebSocket communication layer
- `best-practices.md`: Design best practices in Figma

## Key Features
- Natural language design commands to Figma
- Bidirectional communication between Cursor AI and Figma
- Element creation, modification, and reading from Figma documents
- Component and style management through AI commands
- Layout control and styling with precision

## Main Components

### MCP Server
The server communicates with Cursor AI using the Model Context Protocol and relays commands to the Figma plugin through WebSockets.

### Figma Plugin
The plugin connects to the MCP server and executes commands within Figma, reporting results back to the server.

### Socket Communication
WebSocket-based communication layer that handles message routing between components.

## Common Tasks
- Creating and modifying Figma elements (rectangles, frames, text)
- Applying styling (colors, corner radius, effects)
- Getting document information and selection details
- Working with components and instances
- Exporting nodes as images

## Development Workflow
1. Modify the MCP server in `src/talk_to_figma_mcp/server.ts`
2. Adjust Figma plugin in `src/cursor_mcp_plugin/code.js` and `ui.html`
3. Test communication through socket layer in `src/socket.ts`
4. Run with `bun start` to launch the server

## TypeScript/JavaScript Conventions
- Use descriptive names for functions and variables
- Handle errors and provide meaningful error messages
- Maintain clear separation between server, plugin, and socket logic
- Document complex functionality with comments 