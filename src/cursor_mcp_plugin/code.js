// This is the main code file for the Cursor MCP Figma plugin
// It handles Figma API commands

// Plugin state
const state = {
  serverPort: 3055, // Default port
};

// Show UI
figma.showUI(__html__, { width: 350, height: 450 });

// Plugin commands from UI
figma.ui.onmessage = async (msg) => {
  switch (msg.type) {
    case "update-settings":
      updateSettings(msg);
      break;
    case "notify":
      figma.notify(msg.message);
      break;
    case "close-plugin":
      figma.closePlugin();
      break;
    case "execute-command":
      // Execute commands received from UI (which gets them from WebSocket)
      try {
        const result = await handleCommand(msg.command, msg.params);
        // Send result back to UI
        figma.ui.postMessage({
          type: "command-result",
          id: msg.id,
          result,
        });
      } catch (error) {
        figma.ui.postMessage({
          type: "command-error",
          id: msg.id,
          error: error.message || "Error executing command",
        });
      }
      break;
  }
};

// Listen for plugin commands from menu
figma.on("run", ({ command }) => {
  figma.ui.postMessage({ type: "auto-connect" });
});

// Update plugin settings
function updateSettings(settings) {
  if (settings.serverPort) {
    state.serverPort = settings.serverPort;
  }

  figma.clientStorage.setAsync("settings", {
    serverPort: state.serverPort,
  });
}

// Handle commands from UI
async function handleCommand(command, params) {
  switch (command) {
    case "get_document_info":
      return await getDocumentInfo();
    case "get_selection":
      return await getSelection();
    case "get_node_info":
      if (!params || !params.nodeId) {
        throw new Error("Missing nodeId parameter");
      }
      return await getNodeInfo(params.nodeId);
    case "create_rectangle":
      return await createRectangle(params);
    case "create_frame":
      return await createFrame(params);
    case "create_text":
      return await createText(params);
    case "set_fill_color":
      return await setFillColor(params);
    case "set_stroke_color":
      return await setStrokeColor(params);
    case "move_node":
      return await moveNode(params);
    case "resize_node":
      return await resizeNode(params);
    case "delete_node":
      return await deleteNode(params);
    case "get_styles":
      return await getStyles();
    case "get_local_components":
      return await getLocalComponents();
    case "get_ui_kit_libraries":
      return await getUIKitLibraries();
    case "get_ui_kit_components":
      return await getUIKitComponents(params);
    // case "get_team_components":
    //   return await getTeamComponents();
    case "create_component_instance":
      return await createComponentInstance(params);
    case "create_ui_kit_component":
      return await createUIKitComponent(params);
    case "create_ui_kit_layout":
      return await createUIKitLayout(params);
    case "export_node_as_image":
      return await exportNodeAsImage(params);
    case "execute_code":
      return await executeCode(params);
    case "set_corner_radius":
      return await setCornerRadius(params);
    case "set_text_content":
      return await setTextContent(params);
    case "group_nodes":
      return await groupNodes(params);
    case "create_auto_layout":
      return await createAutoLayout(params);
    case "create_vector":
      return await createVector(params);
    case "create_boolean_operation":
      return await createBooleanOperation(params);
    case "apply_effect":
      return await applyEffect(params);
    case "create_component_set":
      return await createComponentSet(params);
    case "set_constraints":
      return await setConstraints(params);
    case "create_responsive_frame":
      return await createResponsiveFrame(params);
    case "apply_design_tokens":
      return await applyDesignTokens(params);
    case "create_mobile_pattern":
      return await createMobilePattern(params);
    case "check_accessibility":
      return await checkAccessibility(params);
    case "create_design_token":
      return await createDesignToken(params);
    case "create_mobile_screen":
      return await createMobileScreen(params);
    case "analyze_ui_design":
      return await analyzeUIDesign(params);
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

// Command implementations

async function getDocumentInfo() {
  await figma.currentPage.loadAsync();
  const page = figma.currentPage;
  return {
    name: page.name,
    id: page.id,
    type: page.type,
    children: page.children.map((node) => ({
      id: node.id,
      name: node.name,
      type: node.type,
    })),
    currentPage: {
      id: page.id,
      name: page.name,
      childCount: page.children.length,
    },
    pages: [
      {
        id: page.id,
        name: page.name,
        childCount: page.children.length,
      },
    ],
  };
}

async function getSelection() {
  return {
    selectionCount: figma.currentPage.selection.length,
    selection: figma.currentPage.selection.map((node) => ({
      id: node.id,
      name: node.name,
      type: node.type,
      visible: node.visible,
    })),
  };
}

async function getNodeInfo(nodeId) {
  const node = await figma.getNodeByIdAsync(nodeId);

  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  // Base node information
  const nodeInfo = {
    id: node.id,
    name: node.name,
    type: node.type,
    visible: node.visible,
  };

  // Add position and size for SceneNode
  if ("x" in node && "y" in node) {
    nodeInfo.x = node.x;
    nodeInfo.y = node.y;
  }

  if ("width" in node && "height" in node) {
    nodeInfo.width = node.width;
    nodeInfo.height = node.height;
  }

  // Add fills for nodes with fills
  if ("fills" in node) {
    nodeInfo.fills = node.fills;
  }

  // Add strokes for nodes with strokes
  if ("strokes" in node) {
    nodeInfo.strokes = node.strokes;
    if ("strokeWeight" in node) {
      nodeInfo.strokeWeight = node.strokeWeight;
    }
  }

  // Add children for parent nodes
  if ("children" in node) {
    nodeInfo.children = node.children.map((child) => ({
      id: child.id,
      name: child.name,
      type: child.type,
    }));
  }

  // Add text-specific properties
  if (node.type === "TEXT") {
    nodeInfo.characters = node.characters;
    nodeInfo.fontSize = node.fontSize;
    nodeInfo.fontName = node.fontName;
  }

  return nodeInfo;
}

async function createRectangle(params) {
  const {
    x = 0,
    y = 0,
    width = 100,
    height = 100,
    name = "Rectangle",
    parentId,
  } = params || {};

  const rect = figma.createRectangle();
  rect.x = x;
  rect.y = y;
  rect.resize(width, height);
  rect.name = name;

  // If parentId is provided, append to that node, otherwise append to current page
  if (parentId) {
    const parentNode = await figma.getNodeByIdAsync(parentId);
    if (!parentNode) {
      throw new Error(`Parent node not found with ID: ${parentId}`);
    }
    if (!("appendChild" in parentNode)) {
      throw new Error(`Parent node does not support children: ${parentId}`);
    }
    parentNode.appendChild(rect);
  } else {
    figma.currentPage.appendChild(rect);
  }

  return {
    id: rect.id,
    name: rect.name,
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    parentId: rect.parent ? rect.parent.id : undefined,
  };
}

async function createFrame(params) {
  const {
    x = 0,
    y = 0,
    width = 100,
    height = 100,
    name = "Frame",
    parentId,
    fillColor,
    strokeColor,
    strokeWeight,
  } = params || {};

  const frame = figma.createFrame();
  frame.x = x;
  frame.y = y;
  frame.resize(width, height);
  frame.name = name;

  // Set fill color if provided
  if (fillColor) {
    const paintStyle = {
      type: "SOLID",
      color: {
        r: parseFloat(fillColor.r) || 0,
        g: parseFloat(fillColor.g) || 0,
        b: parseFloat(fillColor.b) || 0,
      },
      opacity: parseFloat(fillColor.a) || 1,
    };
    frame.fills = [paintStyle];
  }

  // Set stroke color and weight if provided
  if (strokeColor) {
    const strokeStyle = {
      type: "SOLID",
      color: {
        r: parseFloat(strokeColor.r) || 0,
        g: parseFloat(strokeColor.g) || 0,
        b: parseFloat(strokeColor.b) || 0,
      },
      opacity: parseFloat(strokeColor.a) || 1,
    };
    frame.strokes = [strokeStyle];
  }

  // Set stroke weight if provided
  if (strokeWeight !== undefined) {
    frame.strokeWeight = strokeWeight;
  }

  // If parentId is provided, append to that node, otherwise append to current page
  if (parentId) {
    const parentNode = await figma.getNodeByIdAsync(parentId);
    if (!parentNode) {
      throw new Error(`Parent node not found with ID: ${parentId}`);
    }
    if (!("appendChild" in parentNode)) {
      throw new Error(`Parent node does not support children: ${parentId}`);
    }
    parentNode.appendChild(frame);
  } else {
    figma.currentPage.appendChild(frame);
  }

  return {
    id: frame.id,
    name: frame.name,
    x: frame.x,
    y: frame.y,
    width: frame.width,
    height: frame.height,
    fills: frame.fills,
    strokes: frame.strokes,
    strokeWeight: frame.strokeWeight,
    parentId: frame.parent ? frame.parent.id : undefined,
  };
}

async function createText(params) {
  const {
    x = 0,
    y = 0,
    text = "Text",
    fontSize = 14,
    fontWeight = 400,
    fontColor = { r: 0, g: 0, b: 0, a: 1 }, // Default to black
    name = "Text",
    parentId,
  } = params || {};

  // Map common font weights to Figma font styles
  const getFontStyle = (weight) => {
    switch (weight) {
      case 100:
        return "Thin";
      case 200:
        return "Extra Light";
      case 300:
        return "Light";
      case 400:
        return "Regular";
      case 500:
        return "Medium";
      case 600:
        return "Semi Bold";
      case 700:
        return "Bold";
      case 800:
        return "Extra Bold";
      case 900:
        return "Black";
      default:
        return "Regular";
    }
  };

  const textNode = figma.createText();
  textNode.x = x;
  textNode.y = y;
  textNode.name = name;
  try {
    await figma.loadFontAsync({
      family: "Inter",
      style: getFontStyle(fontWeight),
    });
    textNode.fontName = { family: "Inter", style: getFontStyle(fontWeight) };
    textNode.fontSize = parseInt(fontSize);
  } catch (error) {
    console.error("Error setting font size", error);
  }
  setCharacters(textNode, text);

  // Set text color
  const paintStyle = {
    type: "SOLID",
    color: {
      r: parseFloat(fontColor.r) || 0,
      g: parseFloat(fontColor.g) || 0,
      b: parseFloat(fontColor.b) || 0,
    },
    opacity: parseFloat(fontColor.a) || 1,
  };
  textNode.fills = [paintStyle];

  // If parentId is provided, append to that node, otherwise append to current page
  if (parentId) {
    const parentNode = await figma.getNodeByIdAsync(parentId);
    if (!parentNode) {
      throw new Error(`Parent node not found with ID: ${parentId}`);
    }
    if (!("appendChild" in parentNode)) {
      throw new Error(`Parent node does not support children: ${parentId}`);
    }
    parentNode.appendChild(textNode);
  } else {
    figma.currentPage.appendChild(textNode);
  }

  return {
    id: textNode.id,
    name: textNode.name,
    x: textNode.x,
    y: textNode.y,
    width: textNode.width,
    height: textNode.height,
    characters: textNode.characters,
    fontSize: textNode.fontSize,
    fontWeight: fontWeight,
    fontColor: fontColor,
    fontName: textNode.fontName,
    fills: textNode.fills,
    parentId: textNode.parent ? textNode.parent.id : undefined,
  };
}

async function setFillColor(params) {
  console.log("setFillColor", params);
  const {
    nodeId,
    color: { r, g, b, a },
  } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  if (!("fills" in node)) {
    throw new Error(`Node does not support fills: ${nodeId}`);
  }

  // Create RGBA color
  const rgbColor = {
    r: parseFloat(r) || 0,
    g: parseFloat(g) || 0,
    b: parseFloat(b) || 0,
    a: parseFloat(a) || 1,
  };

  // Set fill
  const paintStyle = {
    type: "SOLID",
    color: {
      r: parseFloat(rgbColor.r),
      g: parseFloat(rgbColor.g),
      b: parseFloat(rgbColor.b),
    },
    opacity: parseFloat(rgbColor.a),
  };

  console.log("paintStyle", paintStyle);

  node.fills = [paintStyle];

  return {
    id: node.id,
    name: node.name,
    fills: [paintStyle],
  };
}

async function setStrokeColor(params) {
  const {
    nodeId,
    color: { r, g, b, a },
    weight = 1,
  } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  if (!("strokes" in node)) {
    throw new Error(`Node does not support strokes: ${nodeId}`);
  }

  // Create RGBA color
  const rgbColor = {
    r: r !== undefined ? r : 0,
    g: g !== undefined ? g : 0,
    b: b !== undefined ? b : 0,
    a: a !== undefined ? a : 1,
  };

  // Set stroke
  const paintStyle = {
    type: "SOLID",
    color: {
      r: rgbColor.r,
      g: rgbColor.g,
      b: rgbColor.b,
    },
    opacity: rgbColor.a,
  };

  node.strokes = [paintStyle];

  // Set stroke weight if available
  if ("strokeWeight" in node) {
    node.strokeWeight = weight;
  }

  return {
    id: node.id,
    name: node.name,
    strokes: node.strokes,
    strokeWeight: "strokeWeight" in node ? node.strokeWeight : undefined,
  };
}

async function moveNode(params) {
  const { nodeId, x, y } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  if (x === undefined || y === undefined) {
    throw new Error("Missing x or y parameters");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  if (!("x" in node) || !("y" in node)) {
    throw new Error(`Node does not support position: ${nodeId}`);
  }

  node.x = x;
  node.y = y;

  return {
    id: node.id,
    name: node.name,
    x: node.x,
    y: node.y,
  };
}

async function resizeNode(params) {
  const { nodeId, width, height } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  if (width === undefined || height === undefined) {
    throw new Error("Missing width or height parameters");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  if (!("resize" in node)) {
    throw new Error(`Node does not support resizing: ${nodeId}`);
  }

  node.resize(width, height);

  return {
    id: node.id,
    name: node.name,
    width: node.width,
    height: node.height,
  };
}

async function deleteNode(params) {
  const { nodeId } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  // Save node info before deleting
  const nodeInfo = {
    id: node.id,
    name: node.name,
    type: node.type,
  };

  node.remove();

  return nodeInfo;
}

// Create a score card for the report
function createScoreCard(title, score) {
  const card = figma.createFrame();
  card.name = `${title} Score`;
  card.resize(150, 150);
  card.cornerRadius = 8;
  card.layoutMode = "VERTICAL";
  card.counterAxisAlignItems = "CENTER";
  card.primaryAxisAlignItems = "CENTER";
  card.itemSpacing = 8;
  
  // Set color based on score
  let color;
  if (score >= 90) {
    color = { r: 0.2, g: 0.8, b: 0.2 }; // Green
  } else if (score >= 70) {
    color = { r: 0.9, g: 0.7, b: 0.1 }; // Yellow
    } else {
    color = { r: 0.9, g: 0.2, b: 0.2 }; // Red
  }
  
  card.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }];
  
  // Title text
  const titleText = figma.createText();
  titleText.characters = title;
  titleText.fontSize = 16;
  titleText.fontName = { family: "Inter", style: "Medium" };
  card.appendChild(titleText);
  
  // Score text
  const scoreText = figma.createText();
  scoreText.characters = Math.round(score).toString();
  scoreText.fontSize = 48;
  scoreText.fontName = { family: "Inter", style: "Bold" };
  scoreText.fills = [{ type: 'SOLID', color }];
  card.appendChild(scoreText);
  
  return card;
}

// Create issues list for the report
async function createIssuesList(issues, severity) {
  const list = figma.createFrame();
  list.name = `${severity} Issues`;
  list.layoutMode = "VERTICAL";
  list.itemSpacing = 8;
  list.fills = [];
  list.counterAxisSizingMode = "AUTO";
  list.primaryAxisSizingMode = "AUTO";
  
  // Add each issue
  for (const issue of issues.slice(0, 5)) { // Show first 5 issues
        const item = figma.createFrame();
    item.name = "Issue";
    item.layoutMode = "VERTICAL";
    item.itemSpacing = 4;
    item.paddingLeft = 12;
    item.paddingRight = 12;
    item.paddingTop = 8;
    item.paddingBottom = 8;
    item.cornerRadius = 4;
        item.fills = [{ 
          type: 'SOLID', 
      color: severity === "high" 
        ? { r: 1, g: 0.9, b: 0.9 } 
        : severity === "medium" 
          ? { r: 1, g: 0.95, b: 0.8 } 
          : { r: 0.9, g: 0.9, b: 1 } 
    }];
    
    const text = figma.createText();
    text.characters = issue.message;
    text.fontSize = 14;
    text.layoutAlign = "STRETCH";
    item.appendChild(text);
    
    list.appendChild(item);
  }
  
  // Add "more" text if there are more issues
  if (issues.length > 5) {
    const moreText = figma.createText();
    moreText.characters = `...and ${issues.length - 5} more issues`;
    moreText.fontSize = 12;
    moreText.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }];
    list.appendChild(moreText);
  }
  
  return list;
}

// Register the command handlers
const commandHandlers = {
  "get_document_info": getDocumentInfo,
  "get_selection": getSelection,
  "get_node_info": getNodeInfo,
  "create_rectangle": createRectangle,
  "create_frame": createFrame,
  "create_text": createText,
  "set_fill_color": setFillColor,
  "set_stroke_color": setStrokeColor,
  "move_node": moveNode,
  "resize_node": resizeNode,
  "delete_node": deleteNode,
  "get_styles": getStyles,
  "get_local_components": getLocalComponents,
  "set_corner_radius": setCornerRadius,
  "set_text_content": setTextContent,
  "group_nodes": groupNodes,
  "create_component_instance": createComponentInstance,
  "export_node_as_image": exportNodeAsImage,
  "create_auto_layout": createAutoLayout,
  "create_vector": createVector,
  "create_boolean_operation": createBooleanOperation,
  "apply_effect": applyEffect,
  "create_component_set": createComponentSet,
  "set_constraints": setConstraints,
  "get_ui_kit_libraries": getUIKitLibraries,
  "get_ui_kit_components": getUIKitComponents,
  "create_ui_kit_component": createUIKitComponent,
  "create_ui_kit_layout": createUIKitLayout,
  "create_responsive_frame": createResponsiveFrame,
  "apply_design_tokens": applyDesignTokens,
  "create_mobile_pattern": createMobilePattern,
  "check_accessibility": checkAccessibility,
  "create_design_token": createDesignToken,
  "create_mobile_screen": createMobileScreen,
  "analyze_ui_design": analyzeUIDesign,
  "execute_code": executeCode
};
