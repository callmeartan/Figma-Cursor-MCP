import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';

// Define TypeScript interfaces for Figma responses
interface FigmaResponse {
  id: string;
  result?: any;
  error?: string;
}

// Custom logging functions that write to stderr instead of stdout to avoid being captured
const logger = {
  info: (message: string) => process.stderr.write(`[INFO] ${message}\n`),
  debug: (message: string) => process.stderr.write(`[DEBUG] ${message}\n`),
  warn: (message: string) => process.stderr.write(`[WARN] ${message}\n`),
  error: (message: string) => process.stderr.write(`[ERROR] ${message}\n`),
  log: (message: string) => process.stderr.write(`[LOG] ${message}\n`)
};

// WebSocket connection and request tracking
let ws: WebSocket | null = null;
const pendingRequests = new Map<string, {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timeout: NodeJS.Timeout;
}>();

// Track which channel each client is in
let currentChannel: string | null = null;

// Create MCP server
const server = new McpServer({
  name: "TalkToFigmaMCP",
  version: "1.0.0",
});

// Document Info Tool
server.tool(
  "get_document_info",
  "Get detailed information about the current Figma document",
  {},
  async () => {
    try {
      const result = await sendCommandToFigma('get_document_info');
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting document info: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Selection Tool
server.tool(
  "get_selection",
  "Get information about the current selection in Figma",
  {},
  async () => {
    try {
      const result = await sendCommandToFigma('get_selection');
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting selection: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Node Info Tool
server.tool(
  "get_node_info",
  "Get detailed information about a specific node in Figma",
  {
    nodeId: z.string().describe("The ID of the node to get information about")
  },
  async ({ nodeId }) => {
    try {
      const result = await sendCommandToFigma('get_node_info', { nodeId });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting node info: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Create Rectangle Tool
server.tool(
  "create_rectangle",
  "Create a new rectangle in Figma",
  {
    x: z.number().describe("X position"),
    y: z.number().describe("Y position"),
    width: z.number().describe("Width of the rectangle"),
    height: z.number().describe("Height of the rectangle"),
    name: z.string().optional().describe("Optional name for the rectangle"),
    parentId: z.string().optional().describe("Optional parent node ID to append the rectangle to")
  },
  async ({ x, y, width, height, name, parentId }) => {
    try {
      const result = await sendCommandToFigma('create_rectangle', {
        x, y, width, height, name: name || 'Rectangle', parentId
      });
      return {
        content: [
          {
            type: "text",
            text: `Created rectangle "${JSON.stringify(result)}"`
          }
        ]
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating rectangle: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Create Frame Tool
server.tool(
  "create_frame",
  "Create a new frame in Figma",
  {
    x: z.number().describe("X position"),
    y: z.number().describe("Y position"),
    width: z.number().describe("Width of the frame"),
    height: z.number().describe("Height of the frame"),
    name: z.string().optional().describe("Optional name for the frame"),
    parentId: z.string().optional().describe("Optional parent node ID to append the frame to"),
    fillColor: z.object({
      r: z.number().min(0).max(1).describe("Red component (0-1)"),
      g: z.number().min(0).max(1).describe("Green component (0-1)"),
      b: z.number().min(0).max(1).describe("Blue component (0-1)"),
      a: z.number().min(0).max(1).optional().describe("Alpha component (0-1)")
    }).optional().describe("Fill color in RGBA format"),
    strokeColor: z.object({
      r: z.number().min(0).max(1).describe("Red component (0-1)"),
      g: z.number().min(0).max(1).describe("Green component (0-1)"),
      b: z.number().min(0).max(1).describe("Blue component (0-1)"),
      a: z.number().min(0).max(1).optional().describe("Alpha component (0-1)")
    }).optional().describe("Stroke color in RGBA format"),
    strokeWeight: z.number().positive().optional().describe("Stroke weight")
  },
  async ({ x, y, width, height, name, parentId, fillColor, strokeColor, strokeWeight }) => {
    try {
      const result = await sendCommandToFigma('create_frame', {
        x, y, width, height, name: name || 'Frame', parentId,
        fillColor: fillColor || { r: 1, g: 1, b: 1, a: 1 },
        strokeColor: strokeColor,
        strokeWeight: strokeWeight
      });
      const typedResult = result as { name: string, id: string };
      return {
        content: [
          {
            type: "text",
            text: `Created frame "${typedResult.name}" with ID: ${typedResult.id}. Use the ID as the parentId to appendChild inside this frame.`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating frame: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Create Text Tool
server.tool(
  "create_text",
  "Create a new text element in Figma",
  {
    x: z.number().describe("X position"),
    y: z.number().describe("Y position"),
    text: z.string().describe("Text content"),
    fontSize: z.number().optional().describe("Font size (default: 14)"),
    fontWeight: z.number().optional().describe("Font weight (e.g., 400 for Regular, 700 for Bold)"),
    fontColor: z.object({
      r: z.number().min(0).max(1).describe("Red component (0-1)"),
      g: z.number().min(0).max(1).describe("Green component (0-1)"),
      b: z.number().min(0).max(1).describe("Blue component (0-1)"),
      a: z.number().min(0).max(1).optional().describe("Alpha component (0-1)")
    }).optional().describe("Font color in RGBA format"),
    name: z.string().optional().describe("Optional name for the text node by default following text"),
    parentId: z.string().optional().describe("Optional parent node ID to append the text to")
  },
  async ({ x, y, text, fontSize, fontWeight, fontColor, name, parentId }) => {
    try {
      const result = await sendCommandToFigma('create_text', {
        x, y, text,
        fontSize: fontSize || 14,
        fontWeight: fontWeight || 400,
        fontColor: fontColor || { r: 0, g: 0, b: 0, a: 1 },
        name: name || 'Text',
        parentId
      });
      const typedResult = result as { name: string, id: string };
      return {
        content: [
          {
            type: "text",
            text: `Created text "${typedResult.name}" with ID: ${typedResult.id}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating text: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Set Fill Color Tool
server.tool(
  "set_fill_color",
  "Set the fill color of a node in Figma can be TextNode or FrameNode",
  {
    nodeId: z.string().describe("The ID of the node to modify"),
    r: z.number().min(0).max(1).describe("Red component (0-1)"),
    g: z.number().min(0).max(1).describe("Green component (0-1)"),
    b: z.number().min(0).max(1).describe("Blue component (0-1)"),
    a: z.number().min(0).max(1).optional().describe("Alpha component (0-1)")
  },
  async ({ nodeId, r, g, b, a }) => {
    try {
      const result = await sendCommandToFigma('set_fill_color', {
        nodeId,
        color: { r, g, b, a: a || 1 }
      });
      const typedResult = result as { name: string };
      return {
        content: [
          {
            type: "text",
            text: `Set fill color of node "${typedResult.name}" to RGBA(${r}, ${g}, ${b}, ${a || 1})`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error setting fill color: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Set Stroke Color Tool
server.tool(
  "set_stroke_color",
  "Set the stroke color of a node in Figma",
  {
    nodeId: z.string().describe("The ID of the node to modify"),
    r: z.number().min(0).max(1).describe("Red component (0-1)"),
    g: z.number().min(0).max(1).describe("Green component (0-1)"),
    b: z.number().min(0).max(1).describe("Blue component (0-1)"),
    a: z.number().min(0).max(1).optional().describe("Alpha component (0-1)"),
    weight: z.number().positive().optional().describe("Stroke weight")
  },
  async ({ nodeId, r, g, b, a, weight }) => {
    try {
      const result = await sendCommandToFigma('set_stroke_color', {
        nodeId,
        color: { r, g, b, a: a || 1 },
        weight: weight || 1
      });
      const typedResult = result as { name: string };
      return {
        content: [
          {
            type: "text",
            text: `Set stroke color of node "${typedResult.name}" to RGBA(${r}, ${g}, ${b}, ${a || 1}) with weight ${weight || 1}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error setting stroke color: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Move Node Tool
server.tool(
  "move_node",
  "Move a node to a new position in Figma",
  {
    nodeId: z.string().describe("The ID of the node to move"),
    x: z.number().describe("New X position"),
    y: z.number().describe("New Y position")
  },
  async ({ nodeId, x, y }) => {
    try {
      const result = await sendCommandToFigma('move_node', { nodeId, x, y });
      const typedResult = result as { name: string };
      return {
        content: [
          {
            type: "text",
            text: `Moved node "${typedResult.name}" to position (${x}, ${y})`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error moving node: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Resize Node Tool
server.tool(
  "resize_node",
  "Resize a node in Figma",
  {
    nodeId: z.string().describe("The ID of the node to resize"),
    width: z.number().positive().describe("New width"),
    height: z.number().positive().describe("New height")
  },
  async ({ nodeId, width, height }) => {
    try {
      const result = await sendCommandToFigma('resize_node', { nodeId, width, height });
      const typedResult = result as { name: string };
      return {
        content: [
          {
            type: "text",
            text: `Resized node "${typedResult.name}" to width ${width} and height ${height}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error resizing node: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Delete Node Tool
server.tool(
  "delete_node",
  "Delete a node from Figma",
  {
    nodeId: z.string().describe("The ID of the node to delete")
  },
  async ({ nodeId }) => {
    try {
      await sendCommandToFigma('delete_node', { nodeId });
      return {
        content: [
          {
            type: "text",
            text: `Deleted node with ID: ${nodeId}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error deleting node: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Get Styles Tool
server.tool(
  "get_styles",
  "Get all styles from the current Figma document",
  {},
  async () => {
    try {
      const result = await sendCommandToFigma('get_styles');
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting styles: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Get Local Components Tool
server.tool(
  "get_local_components",
  "Get all local components from the Figma document",
  {},
  async () => {
    try {
      const result = await sendCommandToFigma('get_local_components');
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting local components: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Get UI Kit Libraries Tool
server.tool(
  "get_ui_kit_libraries",
  "Get all available design system libraries like iOS or Material Design kits in Figma",
  {},
  async () => {
    try {
      const result = await sendCommandToFigma('get_ui_kit_libraries');
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting UI kit libraries: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Get UI Kit Components Tool
server.tool(
  "get_ui_kit_components",
  "Get all components from a specific design system library (e.g., iOS or Material Design kit)",
  {
    libraryName: z.string().describe("Name of the design library (e.g., 'iOS 18 UI Kit', 'Material 3 Design Kit')"),
    category: z.string().optional().describe("Optional category to filter components (e.g., 'Buttons', 'Navigation')")
  },
  async ({ libraryName, category }) => {
    try {
      const result = await sendCommandToFigma('get_ui_kit_components', { libraryName, category });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting UI kit components: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Create UI Kit Component Instance Tool
server.tool(
  "create_ui_kit_component",
  "Create an instance of a component from a design system library like iOS or Material Design",
  {
    componentKey: z.string().describe("Key of the component to instantiate"),
    x: z.number().describe("X position"),
    y: z.number().describe("Y position"),
    scale: z.number().optional().describe("Scale factor for the component (default: 1)"),
    parentId: z.string().optional().describe("Optional parent node ID"),
    variants: z.record(z.string(), z.string()).optional().describe("Variant properties for the component"),
    properties: z.record(z.string(), z.string()).optional().describe("Component properties to set")
  },
  async ({ componentKey, x, y, scale, parentId, variants, properties }) => {
    try {
      const result = await sendCommandToFigma('create_ui_kit_component', { 
        componentKey, 
        x, 
        y, 
        scale, 
        parentId,
        variants,
        properties
      });
      
      const typedResult = result as { id: string, name: string };
      
      return {
        content: [
          {
            type: "text",
            text: `Created UI kit component with ID: ${typedResult.id}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating UI kit component: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Create UI Kit Layout Tool
server.tool(
  "create_ui_kit_layout",
  "Create a complete layout using components from a design system like iOS or Material Design",
  {
    layoutType: z.string().describe("Type of layout to create (e.g., 'ios_screen', 'material_card')"),
    x: z.number().optional().describe("X position"),
    y: z.number().optional().describe("Y position"),
    width: z.number().optional().describe("Width of the layout"),
    height: z.number().optional().describe("Height of the layout"),
    kitName: z.string().describe("Name of the design kit (e.g., 'iOS 18 UI Kit', 'Material 3 Design Kit')"),
    theme: z.enum(['light', 'dark']).optional().describe("Theme to apply ('light' or 'dark')"),
    components: z.array(
      z.object({
        type: z.string().optional().describe("Component type (e.g., 'button', 'navigationBar')"),
        name: z.string().optional().describe("Component name to search for if type is not specified"),
        x: z.number().optional().describe("X position within layout"),
        y: z.number().optional().describe("Y position within layout"),
        properties: z.record(z.string(), z.string()).optional().describe("Component properties"),
        // Additional properties for specific component types
        title: z.string().optional().describe("Title for navigation bars"),
        label: z.string().optional().describe("Label for buttons"),
        buttonStyle: z.string().optional().describe("Style for buttons (e.g., 'filled', 'outlined')"),
        size: z.string().optional().describe("Size for components (e.g., 'small', 'medium', 'large')")
      })
    ).optional().describe("Array of components to add to the layout"),
    style: z.object({
      backgroundColor: z.object({
        r: z.number().min(0).max(1).optional().describe("Red component (0-1)"),
        g: z.number().min(0).max(1).optional().describe("Green component (0-1)"),
        b: z.number().min(0).max(1).optional().describe("Blue component (0-1)")
      }).optional().describe("Background color override")
    }).optional().describe("Style overrides for the layout")
  },
  async ({ layoutType, x, y, width, height, kitName, theme, components, style }) => {
    try {
      const result = await sendCommandToFigma('create_ui_kit_layout', { 
        layoutType, 
        x, 
        y, 
        width, 
        height, 
        kitName, 
        theme, 
        components, 
        style
      });
      
      const typedResult = result as { id: string, name: string };
      
      return {
        content: [
          {
            type: "text",
            text: `Created UI kit layout "${typedResult.name}" with ID: ${typedResult.id}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating UI kit layout: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Get Team Components Tool
// server.tool(
//   "get_team_components",
//   "Get all team library components available in Figma",
//   {},
//   async () => {
//     try {
//       const result = await sendCommandToFigma('get_team_components');
//       return {
//         content: [
//           {
//             type: "text",
//             text: JSON.stringify(result, null, 2)
//           }
//         ]
//       };
//     } catch (error) {
//       return {
//         content: [
//           {
//             type: "text",
//             text: `Error getting team components: ${error instanceof Error ? error.message : String(error)}`
//           }
//         ]
//       };
//     }
//   }
// );

// Create Component Instance Tool
server.tool(
  "create_component_instance",
  "Create an instance of a component in Figma",
  {
    componentKey: z.string().describe("Key of the component to instantiate"),
    x: z.number().describe("X position"),
    y: z.number().describe("Y position")
  },
  async ({ componentKey, x, y }) => {
    try {
      const result = await sendCommandToFigma('create_component_instance', { componentKey, x, y });
      const typedResult = result as { name: string, id: string };
      return {
        content: [
          {
            type: "text",
            text: `Created component instance "${typedResult.name}" with ID: ${typedResult.id}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating component instance: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Export Node as Image Tool
server.tool(
  "export_node_as_image",
  "Export a node as an image from Figma",
  {
    nodeId: z.string().describe("The ID of the node to export"),
    format: z.enum(["PNG", "JPG", "SVG", "PDF"]).optional().describe("Export format"),
    scale: z.number().positive().optional().describe("Export scale")
  },
  async ({ nodeId, format, scale }) => {
    try {
      const result = await sendCommandToFigma('export_node_as_image', {
        nodeId,
        format: format || 'PNG',
        scale: scale || 1
      });
      const typedResult = result as { imageData: string, mimeType: string };

      return {
        content: [
          {
            type: "image",
            data: typedResult.imageData,
            mimeType: typedResult.mimeType || "image/png"
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error exporting node as image: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Execute Figma Code Tool
// server.tool(
//   "execute_figma_code",
//   "Execute arbitrary JavaScript code in Figma (use with caution)",
//   {
//     code: z.string().describe("JavaScript code to execute in Figma")
//   },
//   async ({ code }) => {
//     try {
//       const result = await sendCommandToFigma('execute_code', { code });
//       return {
//         content: [
//           {
//             type: "text",
//             text: `Code executed successfully: ${JSON.stringify(result, null, 2)}`
//           }
//         ]
//       };
//     } catch (error) {
//       return {
//         content: [
//           {
//             type: "text",
//             text: `Error executing code: ${error instanceof Error ? error.message : String(error)}`
//           }
//         ]
//       };
//     }
//   }
// );

// Set Corner Radius Tool
server.tool(
  "set_corner_radius",
  "Set the corner radius of a node in Figma",
  {
    nodeId: z.string().describe("The ID of the node to modify"),
    radius: z.number().min(0).describe("Corner radius value"),
    corners: z.array(z.boolean()).length(4).optional().describe("Optional array of 4 booleans to specify which corners to round [topLeft, topRight, bottomRight, bottomLeft]")
  },
  async ({ nodeId, radius, corners }) => {
    try {
      const result = await sendCommandToFigma('set_corner_radius', {
        nodeId,
        radius,
        corners: corners || [true, true, true, true]
      });
      const typedResult = result as { name: string };
      return {
        content: [
          {
            type: "text",
            text: `Set corner radius of node "${typedResult.name}" to ${radius}px`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error setting corner radius: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Set Text Content Tool
server.tool(
  "set_text_content",
  "Set the text content of an existing text node in Figma",
  {
    nodeId: z.string().describe("The ID of the text node to modify"),
    text: z.string().describe("New text content")
  },
  async ({ nodeId, text }) => {
    try {
      const result = await sendCommandToFigma('set_text_content', { nodeId, text });
      const typedResult = result as { name: string };
      return {
        content: [
          {
            type: "text",
            text: `Updated text content of node "${typedResult.name}" to "${text}"`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error setting text content: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Define design strategy prompt
server.prompt(
  "design_strategy",
  "Best practices for working with Figma designs",
  (extra) => {
    return {
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: `When working with Figma designs, follow these best practices:

1. Start with Document Structure:
   - First use get_document_info() to understand the current document
   - Plan your layout hierarchy before creating elements
   - Create a main container frame for each screen/section

2. Naming Conventions:
   - Use descriptive, semantic names for all elements
   - Follow a consistent naming pattern (e.g., "Login Screen", "Logo Container", "Email Input")
   - Group related elements with meaningful names

3. Layout Hierarchy:
   - Create parent frames first, then add child elements
   - For forms/login screens:
     * Start with the main screen container frame
     * Create a logo container at the top
     * Group input fields in their own containers
     * Place action buttons (login, submit) after inputs
     * Add secondary elements (forgot password, signup links) last

4. Input Fields Structure:
   - Create a container frame for each input field
   - Include a label text above or inside the input
   - Group related inputs (e.g., username/password) together

5. Element Creation:
   - Use create_frame() for containers and input fields
   - Use create_text() for labels, buttons text, and links
   - Set appropriate colors and styles:
     * Use fillColor for backgrounds
     * Use strokeColor for borders
     * Set proper fontWeight for different text elements

6. Mofifying existing elements:
  - use set_text_content() to modify text content.

7. Visual Hierarchy:
   - Position elements in logical reading order (top to bottom)
   - Maintain consistent spacing between elements
   - Use appropriate font sizes for different text types:
     * Larger for headings/welcome text
     * Medium for input labels
     * Standard for button text
     * Smaller for helper text/links

8. Best Practices:
   - Verify each creation with get_node_info()
   - Use parentId to maintain proper hierarchy
   - Group related elements together in frames
   - Keep consistent spacing and alignment

Example Login Screen Structure:
- Login Screen (main frame)
  - Logo Container (frame)
    - Logo (image/text)
  - Welcome Text (text)
  - Input Container (frame)
    - Email Input (frame)
      - Email Label (text)
      - Email Field (frame)
    - Password Input (frame)
      - Password Label (text)
      - Password Field (frame)
  - Login Button (frame)
    - Button Text (text)
  - Helper Links (frame)
    - Forgot Password (text)
    - Don't have account (text)`
          }
        }
      ],
      description: "Best practices for working with Figma designs"
    };
  }
);

// Define command types and parameters
type FigmaCommand =
  | 'get_document_info'
  | 'get_selection'
  | 'get_node_info'
  | 'create_rectangle'
  | 'create_frame'
  | 'create_text'
  | 'set_fill_color'
  | 'set_stroke_color'
  | 'move_node'
  | 'resize_node'
  | 'delete_node'
  | 'get_styles'
  | 'get_local_components'
  | 'get_team_components'
  | 'create_component_instance'
  | 'export_node_as_image'
  | 'execute_code'
  | 'join'
  | 'set_corner_radius'
  | 'set_text_content'
  | 'group_nodes'
  | 'create_auto_layout'
  | 'create_vector'
  | 'create_boolean_operation'
  | 'apply_effect'
  | 'create_component_set'
  | 'set_constraints'
  | 'get_ui_kit_libraries'
  | 'get_ui_kit_components'
  | 'create_ui_kit_component'
  | 'create_ui_kit_layout';

// Helper function to process Figma node responses
function processFigmaNodeResponse(result: unknown): any {
  if (!result || typeof result !== 'object') {
    return result;
  }

  // Check if this looks like a node response
  const resultObj = result as Record<string, unknown>;
  if ('id' in resultObj && typeof resultObj.id === 'string') {
    // It appears to be a node response, log the details
    logger.info(`Processed Figma node: ${resultObj.name || 'Unknown'} (ID: ${resultObj.id})`);

    if ('x' in resultObj && 'y' in resultObj) {
      logger.debug(`Node position: (${resultObj.x}, ${resultObj.y})`);
    }

    if ('width' in resultObj && 'height' in resultObj) {
      logger.debug(`Node dimensions: ${resultObj.width}×${resultObj.height}`);
    }
  }

  return result;
}

// Simple function to connect to Figma WebSocket server
function connectToFigma(port: number = 3055) {
  // If already connected, do nothing
  if (ws && ws.readyState === WebSocket.OPEN) {
    logger.info('Already connected to Figma');
    return;
  }

  logger.info(`Connecting to Figma socket server on port ${port}...`);
  ws = new WebSocket(`ws://localhost:${port}`);

  ws.on('open', () => {
    logger.info('Connected to Figma socket server');
    // Reset channel on new connection
    currentChannel = null;
  });

  ws.on('message', (data: any) => {
    try {
      const json = JSON.parse(data) as { message: FigmaResponse };
      const myResponse = json.message;
      logger.debug(`Received message: ${JSON.stringify(myResponse)}`);
      logger.log('myResponse' + JSON.stringify(myResponse));

      // Handle response to a request
      if (myResponse.id && pendingRequests.has(myResponse.id) && myResponse.result) {
        const request = pendingRequests.get(myResponse.id)!;
        clearTimeout(request.timeout);

        if (myResponse.error) {
          logger.error(`Error from Figma: ${myResponse.error}`);
          request.reject(new Error(myResponse.error));
        } else {
          if (myResponse.result) {
            request.resolve(myResponse.result);
          }
        }

        pendingRequests.delete(myResponse.id);
      } else {
        // Handle broadcast messages or events
        logger.info(`Received broadcast message: ${JSON.stringify(myResponse)}`);
      }
    } catch (error) {
      logger.error(`Error parsing message: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  ws.on('error', (error) => {
    logger.error(`Socket error: ${error}`);
  });

  ws.on('close', () => {
    logger.info('Disconnected from Figma socket server');
    ws = null;

    // Reject all pending requests
    for (const [id, request] of pendingRequests.entries()) {
      clearTimeout(request.timeout);
      request.reject(new Error('Connection closed'));
      pendingRequests.delete(id);
    }

    // Attempt to reconnect
    logger.info('Attempting to reconnect in 2 seconds...');
    setTimeout(() => connectToFigma(port), 2000);
  });
}

// Function to join a channel
async function joinChannel(channelName: string): Promise<void> {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    throw new Error('Not connected to Figma');
  }

  try {
    await sendCommandToFigma('join', { channel: channelName });
    currentChannel = channelName;
    logger.info(`Joined channel: ${channelName}`);
  } catch (error) {
    logger.error(`Failed to join channel: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

// Function to send commands to Figma
function sendCommandToFigma(command: FigmaCommand, params: unknown = {}): Promise<unknown> {
  return new Promise((resolve, reject) => {
    // If not connected, try to connect first
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      connectToFigma();
      reject(new Error('Not connected to Figma. Attempting to connect...'));
      return;
    }

    // Check if we need a channel for this command
    const requiresChannel = command !== 'join';
    if (requiresChannel && !currentChannel) {
      reject(new Error('Must join a channel before sending commands'));
      return;
    }

    const id = uuidv4();
    const request = {
      id,
      type: command === 'join' ? 'join' : 'message',
      ...(command === 'join' ? { channel: (params as any).channel } : { channel: currentChannel }),
      message: {
        id,
        command,
        params: {
          ...(params as any),
        }
      }
    };

    // Set timeout for request
    const timeout = setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        logger.error(`Request ${id} to Figma timed out after 30 seconds`);
        reject(new Error('Request to Figma timed out'));
      }
    }, 30000); // 30 second timeout

    // Store the promise callbacks to resolve/reject later
    pendingRequests.set(id, { resolve, reject, timeout });

    // Send the request
    logger.info(`Sending command to Figma: ${command}`);
    logger.debug(`Request details: ${JSON.stringify(request)}`);
    ws.send(JSON.stringify(request));
  });
}

// Update the join_channel tool
server.tool(
  "join_channel",
  "Join a specific channel to communicate with Figma",
  {
    channel: z.string().describe("The name of the channel to join").default("")
  },
  async ({ channel }) => {
    try {
      if (!channel) {
        // If no channel provided, ask the user for input
        return {
          content: [
            {
              type: "text",
              text: "Please provide a channel name to join:"
            }
          ],
          followUp: {
            tool: "join_channel",
            description: "Join the specified channel"
          }
        };
      }

      await joinChannel(channel);
      return {
        content: [
          {
            type: "text",
            text: `Successfully joined channel: ${channel}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error joining channel: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Group Nodes Tool
server.tool(
  "group_nodes",
  "Group selected nodes in Figma",
  {
    nodeIds: z.array(z.string()).describe("Array of node IDs to group"),
    name: z.string().optional().describe("Optional name for the group")
  },
  async ({ nodeIds, name }) => {
    try {
      const result = await sendCommandToFigma('group_nodes', { nodeIds, name: name || 'Group' });
      return {
        content: [
          {
            type: "text",
            text: `Created group with ID: ${JSON.stringify(result)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating group: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Auto Layout Tool
server.tool(
  "create_auto_layout",
  "Apply auto layout to a frame in Figma",
  {
    nodeId: z.string().describe("ID of the frame to apply auto layout to"),
    direction: z.enum(["HORIZONTAL", "VERTICAL"]).describe("Layout direction"),
    spacing: z.number().describe("Space between items"),
    padding: z.object({
      top: z.number().describe("Top padding"),
      right: z.number().describe("Right padding"),
      bottom: z.number().describe("Bottom padding"),
      left: z.number().describe("Left padding")
    }).describe("Padding values")
  },
  async ({ nodeId, direction, spacing, padding }) => {
    try {
      const result = await sendCommandToFigma('create_auto_layout', {
        nodeId,
        direction,
        spacing,
        padding
      });
      return {
        content: [
          {
            type: "text",
            text: `Applied auto layout to frame ${nodeId}: ${JSON.stringify(result)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error applying auto layout: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Create Vector Tool
server.tool(
  "create_vector",
  "Create a vector path in Figma",
  {
    pathData: z.string().describe("SVG path data string"),
    x: z.number().describe("X position"),
    y: z.number().describe("Y position"),
    fillColor: z.object({
      r: z.number().min(0).max(1).describe("Red component (0-1)"),
      g: z.number().min(0).max(1).describe("Green component (0-1)"),
      b: z.number().min(0).max(1).describe("Blue component (0-1)"),
      a: z.number().min(0).max(1).optional().describe("Alpha component (0-1)")
    }).optional().describe("Fill color in RGBA format"),
    strokeColor: z.object({
      r: z.number().min(0).max(1).describe("Red component (0-1)"),
      g: z.number().min(0).max(1).describe("Green component (0-1)"),
      b: z.number().min(0).max(1).describe("Blue component (0-1)"),
      a: z.number().min(0).max(1).optional().describe("Alpha component (0-1)")
    }).optional().describe("Stroke color in RGBA format"),
    strokeWeight: z.number().positive().optional().describe("Stroke weight"),
    name: z.string().optional().describe("Optional name for the vector"),
    parentId: z.string().optional().describe("Optional parent node ID")
  },
  async ({ pathData, x, y, fillColor, strokeColor, strokeWeight, name, parentId }) => {
    try {
      const result = await sendCommandToFigma('create_vector', {
        pathData,
        x,
        y,
        fillColor: fillColor || { r: 0, g: 0, b: 0, a: 1 },
        strokeColor,
        strokeWeight,
        name: name || 'Vector',
        parentId
      });
      return {
        content: [
          {
            type: "text",
            text: `Created vector with ID: ${JSON.stringify(result)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating vector: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Boolean Operation Tool
server.tool(
  "create_boolean_operation",
  "Create a boolean operation from nodes in Figma",
  {
    nodeIds: z.array(z.string()).describe("Array of node IDs for the operation"),
    operation: z.enum(["UNION", "SUBTRACT", "INTERSECT", "EXCLUDE"]).describe("Boolean operation type"),
    name: z.string().optional().describe("Optional name for the resulting node")
  },
  async ({ nodeIds, operation, name }) => {
    try {
      const result = await sendCommandToFigma('create_boolean_operation', { 
        nodeIds, 
        operation, 
        name: name || `${operation} Operation` 
      });
      return {
        content: [
          {
            type: "text",
            text: `Created boolean operation with ID: ${JSON.stringify(result)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating boolean operation: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Apply Effect Tool
server.tool(
  "apply_effect",
  "Apply effects like shadows or blurs to a node in Figma",
  {
    nodeId: z.string().describe("ID of the node to apply effect to"),
    effectType: z.enum(["DROP_SHADOW", "INNER_SHADOW", "LAYER_BLUR", "BACKGROUND_BLUR"]).describe("Type of effect"),
    radius: z.number().min(0).describe("Blur radius or shadow spread"),
    color: z.object({
      r: z.number().min(0).max(1).describe("Red component (0-1)"),
      g: z.number().min(0).max(1).describe("Green component (0-1)"),
      b: z.number().min(0).max(1).describe("Blue component (0-1)"),
      a: z.number().min(0).max(1).describe("Alpha component (0-1)")
    }).optional().describe("Effect color (for shadows)"),
    offset: z.object({
      x: z.number().describe("X offset (for shadows)"),
      y: z.number().describe("Y offset (for shadows)")
    }).optional().describe("Shadow offset")
  },
  async ({ nodeId, effectType, radius, color, offset }) => {
    try {
      const result = await sendCommandToFigma('apply_effect', {
        nodeId,
        effectType,
        radius,
        color,
        offset
      });
      return {
        content: [
          {
            type: "text",
            text: `Applied ${effectType} effect to node ${nodeId}: ${JSON.stringify(result)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error applying effect: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Create Component Set (Variants) Tool
server.tool(
  "create_component_set",
  "Create a component set with variants in Figma",
  {
    components: z.array(z.object({
      nodeId: z.string().describe("ID of component to include in the set"),
      properties: z.record(z.string(), z.string()).describe("Property key-value pairs for this variant")
    })).describe("Array of components with their variant properties"),
    name: z.string().optional().describe("Optional name for the component set")
  },
  async ({ components, name }) => {
    try {
      const result = await sendCommandToFigma('create_component_set', {
        components,
        name: name || 'Component Set'
      });
      return {
        content: [
          {
            type: "text",
            text: `Created component set with ID: ${JSON.stringify(result)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating component set: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Set Constraints Tool
server.tool(
  "set_constraints",
  "Set layout constraints for a node in Figma",
  {
    nodeId: z.string().describe("ID of the node to set constraints for"),
    horizontal: z.enum(["LEFT", "RIGHT", "CENTER", "SCALE", "STRETCH"]).describe("Horizontal constraint"),
    vertical: z.enum(["TOP", "BOTTOM", "CENTER", "SCALE", "STRETCH"]).describe("Vertical constraint")
  },
  async ({ nodeId, horizontal, vertical }) => {
    try {
      const result = await sendCommandToFigma('set_constraints', {
        nodeId,
        horizontal,
        vertical
      });
      return {
        content: [
          {
            type: "text",
            text: `Set constraints for node ${nodeId}: ${JSON.stringify(result)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error setting constraints: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Start the server
async function main() {
  try {
    // Try to connect to Figma socket server
    connectToFigma();
  } catch (error) {
    logger.warn(`Could not connect to Figma initially: ${error instanceof Error ? error.message : String(error)}`);
    logger.warn('Will try to connect when the first command is sent');
  }

  // Start the MCP server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('FigmaMCP server running on stdio');
}

// Run the server
main().catch(error => {
  logger.error(`Error starting FigmaMCP server: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});