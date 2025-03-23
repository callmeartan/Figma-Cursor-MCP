# 🎨 Cursor Talk to Figma

<p align="center">
  <img src="https://github.com/user-attachments/assets/129a14d2-ed73-470f-9a4c-2240b2a4885c" alt="Cursor Talk to Figma Demo" width="700">
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <a href="https://bun.sh/"><img src="https://img.shields.io/badge/Powered%20by-Bun-black?style=flat&logo=bun" alt="Powered by Bun"></a>
  <a href="https://www.figma.com/community/plugins"><img src="https://img.shields.io/badge/Figma-Plugin-f24e1e?style=flat&logo=figma" alt="Figma Plugin"></a>
</p>

## ✨ Design with AI, Effortlessly

Unlock the power of **AI-driven design** with a seamless bridge between Cursor AI and Figma. This Model Context Protocol (MCP) integration lets you create, modify, and read Figma designs through natural language - revolutionizing your design workflow.


## 🚀 What You Can Do

- 💬 **Natural Language Design** - Create and modify Figma elements with simple text commands
- 🔄 **Bidirectional Communication** - Seamless flow of data between Cursor AI and Figma
- 🔍 **Design Intelligence** - Extract detailed information from your Figma documents
- 🧩 **Component Magic** - Work with Figma components through AI
- 🎭 **Style Transformation** - Apply styling changes with natural language
- 📊 **Layout Control** - Position, resize, and organize elements with precision

## ⚡ Quick Start

### Prerequisites

- [Bun](https://bun.sh/) runtime
- [Cursor AI](https://cursor.sh/) editor
- [Figma](https://www.figma.com/) account

### Setup in 60 Seconds

1. **Install Dependencies**
   ```bash
   # Install Bun if needed
   curl -fsSL https://bun.sh/install | bash
   
   # Setup project
   bun setup
   ```

2. **Launch Server**
   ```bash
   bun start
   ```

3. **Connect Figma**
   - Open Figma and run the Cursor MCP Plugin (see setup details below)
   - Connect to the running server
   
4. **Start Designing with AI**
   - Use Cursor AI to send commands to Figma

## 🔌 Detailed Setup

### Figma Plugin Configuration

1. In Figma, navigate to **Plugins > Development > New Plugin**
2. Select "Link existing plugin"
3. Choose the `src/cursor_mcp_plugin/manifest.json` file
4. The plugin will appear in your development plugins

### MCP Server Setup

Add the server to your Cursor MCP configuration in `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "TalkToFigma": {
      "command": "bun",
      "args": [
        "/path/to/cursor-talk-to-figma-mcp/src/talk_to_figma_mcp/server.ts"
      ]
    }
  }
}
```

## 🧰 Command Reference

### Essential Commands

| Command | Description |
|---------|-------------|
| `join_channel` | Connect to a communication channel |
| `get_document_info` | Retrieve Figma document details |
| `get_selection` | Get information about selected elements |
| `get_node_info` | Get detailed information about a specific node |

### Creation Commands

| Command | Description |
|---------|-------------|
| `create_rectangle` | Create a rectangle with custom properties |
| `create_frame` | Create a new frame |
| `create_text` | Create text elements |
| `create_component_instance` | Create an instance of a component |

### Styling Commands

| Command | Description |
|---------|-------------|
| `set_fill_color` | Set fill color (RGBA) |
| `set_stroke_color` | Set stroke color and weight |
| `set_corner_radius` | Set corner radius (with per-corner control) |
| `set_text_content` | Update text content |

### Layout Commands

| Command | Description |
|---------|-------------|
| `move_node` | Reposition elements |
| `resize_node` | Change dimensions |
| `delete_node` | Remove elements |

### Component & Style Commands

| Command | Description |
|---------|-------------|
| `get_styles` | Retrieve available styles |
| `get_local_components` | Get information about local components |
| `get_team_components` | Get information about team components |

### Export Commands

| Command | Description |
|---------|-------------|
| `export_node_as_image` | Export as PNG, JPG, SVG, or PDF |

## 💡 Best Practices

1. **Start with Context** - Always begin by joining a channel and getting document info
2. **Verify Selections** - Check what's selected before making changes
3. **Work with Components** - Use component instances for design consistency
4. **Verify Changes** - Use `get_node_info` after modifications
5. **Handle Errors** - Commands may throw exceptions, be ready to handle them

## 🏗️ Project Architecture

```
cursor-talk-to-figma-mcp/
├── src/
│   ├── talk_to_figma_mcp/    # TypeScript MCP server
│   ├── cursor_mcp_plugin/    # Figma plugin
│   └── socket.ts             # WebSocket communication
```

## 🛠️ Development

To customize the Figma plugin:

```bash
cd src/cursor_mcp_plugin
# Edit code.js and ui.html as needed
```

## 📄 License

This project is licensed under the [MIT License](LICENSE) - design freely!

---

<p align="center">
  Made with ❤️ for designers and developers
</p>
