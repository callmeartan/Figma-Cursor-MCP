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

async function getStyles() {
  const styles = {
    colors: await figma.getLocalPaintStylesAsync(),
    texts: await figma.getLocalTextStylesAsync(),
    effects: await figma.getLocalEffectStylesAsync(),
    grids: await figma.getLocalGridStylesAsync(),
  };

  return {
    colors: styles.colors.map((style) => ({
      id: style.id,
      name: style.name,
      key: style.key,
      paint: style.paints[0],
    })),
    texts: styles.texts.map((style) => ({
      id: style.id,
      name: style.name,
      key: style.key,
      fontSize: style.fontSize,
      fontName: style.fontName,
    })),
    effects: styles.effects.map((style) => ({
      id: style.id,
      name: style.name,
      key: style.key,
    })),
    grids: styles.grids.map((style) => ({
      id: style.id,
      name: style.name,
      key: style.key,
    })),
  };
}

async function getLocalComponents() {
  await figma.loadAllPagesAsync();

  const components = figma.root.findAllWithCriteria({
    types: ["COMPONENT"],
  });

  return {
    count: components.length,
    components: components.map((component) => ({
      id: component.id,
      name: component.name,
      key: "key" in component ? component.key : null,
    })),
  };
}

// Get available UI kit libraries
async function getUIKitLibraries() {
  try {
    // Get published libraries
    const libraries = await Promise.all(figma.getAvailableLibrariesAsync());
    
    // Filter for UI kit libraries (iOS, Material Design, etc.)
    const uiKitLibraries = libraries.filter(lib => {
      const name = lib.name.toLowerCase();
      return name.includes('ui kit') || 
             name.includes('design kit') || 
             name.includes('ios') || 
             name.includes('material') ||
             name.includes('design system');
    });
    
    return {
      count: uiKitLibraries.length,
      libraries: uiKitLibraries.map(lib => ({
        id: lib.id,
        name: lib.name,
        type: lib.type,
        libraryType: lib.libraryType,
      }))
    };
  } catch (error) {
    console.error("Error getting UI kit libraries:", error);
    throw new Error(`Error getting UI kit libraries: ${error.message}`);
  }
}

// Get components from a specific UI kit
async function getUIKitComponents(params) {
  const { libraryName, category } = params || {};
  
  if (!libraryName) {
    throw new Error("Library name is required");
  }
  
  try {
    // Get all libraries
    const libraries = await figma.getAvailableLibrariesAsync();
    
    // Find the requested library
    const library = libraries.find(lib => 
      lib.name.toLowerCase() === libraryName.toLowerCase() ||
      lib.name.toLowerCase().includes(libraryName.toLowerCase())
    );
    
    if (!library) {
      throw new Error(`Library not found: ${libraryName}`);
    }
    
    // Get components from the library
    const componentSets = await Promise.all(figma.getComponentSetsAsync(library.id));
    const components = await Promise.all(figma.getComponentsAsync(library.id));
    
    // Filter by category if provided
    let filteredComponents = components;
    let filteredComponentSets = componentSets;
    
    if (category) {
      const categoryLower = category.toLowerCase();
      filteredComponents = components.filter(comp => 
        comp.name.toLowerCase().includes(categoryLower) ||
        (comp.documentationLinks && comp.documentationLinks.some(link => 
          link.name.toLowerCase().includes(categoryLower)))
      );
      
      filteredComponentSets = componentSets.filter(set => 
        set.name.toLowerCase().includes(categoryLower) ||
        (set.documentationLinks && set.documentationLinks.some(link => 
          link.name.toLowerCase().includes(categoryLower)))
      );
    }
    
    return {
      library: {
        id: library.id,
        name: library.name
      },
      componentSets: filteredComponentSets.map(set => ({
        id: set.id,
        name: set.name,
        key: set.key,
        description: set.description
      })),
      components: filteredComponents.map(comp => ({
        id: comp.id,
        name: comp.name,
        key: comp.key,
        description: comp.description
      }))
    };
  } catch (error) {
    console.error("Error getting UI kit components:", error);
    throw new Error(`Error getting UI kit components: ${error.message}`);
  }
}

// async function getTeamComponents() {
//   try {
//     const teamComponents =
//       await figma.teamLibrary.getAvailableComponentsAsync();

//     return {
//       count: teamComponents.length,
//       components: teamComponents.map((component) => ({
//         key: component.key,
//         name: component.name,
//         description: component.description,
//         libraryName: component.libraryName,
//       })),
//     };
//   } catch (error) {
//     throw new Error(`Error getting team components: ${error.message}`);
//   }
// }

async function createComponentInstance(params) {
  const { componentKey, x = 0, y = 0 } = params || {};

  if (!componentKey) {
    throw new Error("Missing componentKey parameter");
  }

  try {
    const component = await figma.importComponentByKeyAsync(componentKey);
    const instance = component.createInstance();

    instance.x = x;
    instance.y = y;

    figma.currentPage.appendChild(instance);

    return {
      id: instance.id,
      name: instance.name,
      x: instance.x,
      y: instance.y,
      width: instance.width,
      height: instance.height,
      componentId: instance.componentId,
    };
  } catch (error) {
    throw new Error(`Error creating component instance: ${error.message}`);
  }
}

// Create a UI kit component with more options
async function createUIKitComponent(params) {
  const { libraryName, componentName, x, y, properties, parentId } = params || {};
  
  if (!libraryName || !componentName) {
    throw new Error("Library name and component name are required");
  }
  
  try {
    // Get all libraries
    const libraries = await figma.getAvailableLibrariesAsync();
    
    // Find the requested library
    const library = libraries.find(lib => 
      lib.name.toLowerCase() === libraryName.toLowerCase() ||
      lib.name.toLowerCase().includes(libraryName.toLowerCase())
    );
    
    if (!library) {
      throw new Error(`Library not found: ${libraryName}`);
    }
    
    // Get components from the library
    const components = await Promise.all(figma.getComponentsAsync(library.id));
    const componentSets = await Promise.all(figma.getComponentSetsAsync(library.id));
    
    // Find the requested component by name
    const component = components.find(comp => 
      comp.name.toLowerCase() === componentName.toLowerCase() ||
      comp.name.toLowerCase().includes(componentName.toLowerCase())
    );
    
    // If component not found directly, try to find it in component sets
    let instance;
    if (component) {
      // Create instance of the component
      instance = await figma.createComponentInstanceAsync(component.key);
    } else {
      // Try to find the component in component sets
      for (const set of componentSets) {
        if (set.name.toLowerCase() === componentName.toLowerCase() ||
            set.name.toLowerCase().includes(componentName.toLowerCase())) {
          // Get variants from this component set
          const variants = await Promise.all(figma.getComponentsBySetIdAsync(set.id));
          if (variants.length > 0) {
            // Use the first variant or the one that matches properties
            let selectedVariant = variants[0];
            
            // If properties are provided, try to find a matching variant
            if (properties && Object.keys(properties).length > 0) {
              const matchingVariant = variants.find(variant => {
                const variantName = variant.name.toLowerCase();
                return Object.entries(properties).every(([key, value]) => {
                  const propertyPattern = `${key.toLowerCase()}=${value.toLowerCase()}`;
                  return variantName.includes(propertyPattern);
                });
              });
              
              if (matchingVariant) {
                selectedVariant = matchingVariant;
              }
            }
            
            instance = await figma.createComponentInstanceAsync(selectedVariant.key);
            break;
          }
        }
      }
    }
    
    if (!instance) {
      throw new Error(`Component not found: ${componentName}`);
    }
    
    // Set position
    instance.x = x || 0;
    instance.y = y || 0;
    
    // Set properties if available
    if (properties && Object.keys(properties).length > 0 && instance.setProperties) {
      // Convert properties to a format Figma expects
      const figmaProperties = {};
      for (const [key, value] of Object.entries(properties)) {
        figmaProperties[key] = value;
      }
      
      try {
        instance.setProperties(figmaProperties);
      } catch (propError) {
        console.warn(`Error setting properties: ${propError.message}`);
      }
    }
    
    // Add to parent if specified
    if (parentId) {
      const parent = await figma.getNodeByIdAsync(parentId);
      if (parent && 'appendChild' in parent) {
        parent.appendChild(instance);
      }
    }
    
    return {
      id: instance.id,
      name: instance.name,
      type: instance.type,
      library: library.name,
      component: componentName
    };
  } catch (error) {
    console.error("Error creating UI kit component:", error);
    throw new Error(`Error creating UI kit component: ${error.message}`);
  }
}

// Create a layout using UI kit components
async function createUIKitLayout(params) {
  const { 
    libraryName, 
    layoutType, 
    x = 0, 
    y = 0, 
    width = 390, 
    height = 844, 
    theme = 'light',
    data = {},
    parentId 
  } = params || {};
  
  if (!libraryName || !layoutType) {
    throw new Error("Library name and layout type are required");
  }
  
  try {
    // Create parent frame for the layout
    const frame = figma.createFrame();
    frame.name = `${libraryName} - ${layoutType} Layout`;
    frame.x = x;
    frame.y = y;
    frame.resize(width, height);
    
    // Set fill color based on theme
    if (theme === 'dark') {
      frame.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }];
    } else {
      frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    }
    
    // Add to parent if specified
    if (parentId) {
      const parent = await figma.getNodeByIdAsync(parentId);
      if (parent && 'appendChild' in parent) {
        parent.appendChild(frame);
      }
    }
    
    // Create layout based on layoutType
    switch (layoutType.toLowerCase()) {
      case 'login':
        await createLoginLayout(libraryName, frame, theme, data);
        break;
      case 'profile':
        await createProfileLayout(libraryName, frame, theme, data);
        break;
      case 'settings':
        await createSettingsLayout(libraryName, frame, theme, data);
        break;
      case 'onboarding':
        await createOnboardingLayout(libraryName, frame, theme, data);
        break;
      default:
        // Generic layout with basic components
        await createGenericLayout(libraryName, frame, theme, data);
    }
    
    return {
      id: frame.id,
      name: frame.name,
      type: frame.type,
      width: frame.width,
      height: frame.height
    };
  } catch (error) {
    console.error("Error creating UI kit layout:", error);
    throw new Error(`Error creating UI kit layout: ${error.message}`);
  }
}

// Helper function to create login layout
async function createLoginLayout(libraryName, frame, theme, data) {
  try {
    // Create header
    const header = figma.createText();
    header.characters = data.title || "Sign In";
    header.fontSize = 24;
    header.fontName = { family: "Inter", style: "Bold" };
    header.x = frame.width / 2 - header.width / 2;
    header.y = 80;
    header.textAlignHorizontal = "CENTER";
    
    // Create subtitle
    const subtitle = figma.createText();
    subtitle.characters = data.subtitle || "Enter your credentials to continue";
    subtitle.fontSize = 16;
    subtitle.fontName = { family: "Inter", style: "Regular" };
    subtitle.x = frame.width / 2 - subtitle.width / 2;
    subtitle.y = header.y + header.height + 16;
    subtitle.textAlignHorizontal = "CENTER";
    
    // Create email field
    const emailField = figma.createRectangle();
    emailField.name = "Email Field";
    emailField.x = frame.width * 0.1;
    emailField.y = subtitle.y + subtitle.height + 40;
    emailField.resize(frame.width * 0.8, 50);
    emailField.cornerRadius = 8;
    
    // Apply theme
    if (theme === 'dark') {
      emailField.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
      header.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      subtitle.fills = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 } }];
    } else {
      emailField.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }];
      header.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
      subtitle.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }];
    }
    
    // Email label
    const emailLabel = figma.createText();
    emailLabel.characters = "Email";
    emailLabel.fontSize = 16;
    emailLabel.x = emailField.x + 12;
    emailLabel.y = emailField.y + (emailField.height - emailLabel.height) / 2;
    
    // Create password field
    const passwordField = figma.createRectangle();
    passwordField.name = "Password Field";
    passwordField.x = emailField.x;
    passwordField.y = emailField.y + emailField.height + 16;
    passwordField.resize(emailField.width, emailField.height);
    passwordField.cornerRadius = emailField.cornerRadius;
    passwordField.fills = emailField.fills;
    
    // Password label
    const passwordLabel = figma.createText();
    passwordLabel.characters = "Password";
    passwordLabel.fontSize = 16;
    passwordLabel.x = passwordField.x + 12;
    passwordLabel.y = passwordField.y + (passwordField.height - passwordLabel.height) / 2;
    
    // Create login button
    const loginButton = figma.createRectangle();
    loginButton.name = "Login Button";
    loginButton.x = emailField.x;
    loginButton.y = passwordField.y + passwordField.height + 32;
    loginButton.resize(emailField.width, emailField.height);
    loginButton.cornerRadius = 8;
    
    // Apply accent color
    const accentColor = theme === 'dark' 
      ? { r: 0.2, g: 0.6, b: 1 } 
      : { r: 0.1, g: 0.4, b: 0.9 };
    
    loginButton.fills = [{ type: 'SOLID', color: accentColor }];
    
    // Login button text
    const buttonText = figma.createText();
    buttonText.characters = data.buttonText || "Sign In";
    buttonText.fontSize = 16;
    buttonText.fontName = { family: "Inter", style: "Bold" };
    buttonText.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    
    // Center the text in the button
    buttonText.x = loginButton.x + (loginButton.width - buttonText.width) / 2;
    buttonText.y = loginButton.y + (loginButton.height - buttonText.height) / 2;
    
    // "Forgot password" link
    const forgotPassword = figma.createText();
    forgotPassword.characters = "Forgot Password?";
    forgotPassword.fontSize = 14;
    forgotPassword.x = frame.width / 2 - forgotPassword.width / 2;
    forgotPassword.y = loginButton.y + loginButton.height + 24;
    
    // Apply theme to forgot password
    if (theme === 'dark') {
      forgotPassword.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.7, b: 1 } }];
    } else {
      forgotPassword.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.4, b: 0.9 } }];
    }
    
    // Add all elements to the frame
    frame.appendChild(header);
    frame.appendChild(subtitle);
    frame.appendChild(emailField);
    frame.appendChild(emailLabel);
    frame.appendChild(passwordField);
    frame.appendChild(passwordLabel);
    frame.appendChild(loginButton);
    frame.appendChild(buttonText);
    frame.appendChild(forgotPassword);
  } catch (error) {
    console.error("Error creating login layout:", error);
    throw error;
  }
}

// Helper function to create a generic layout 
async function createGenericLayout(libraryName, frame, theme, data) {
  try {
    // Create a navigation bar
    const navBar = figma.createRectangle();
    navBar.name = "Navigation Bar";
    navBar.x = 0;
    navBar.y = 0;
    navBar.resize(frame.width, 60);
    
    // Apply theme to navigation bar
    if (theme === 'dark') {
      navBar.fills = [{ type: 'SOLID', color: { r: 0.15, g: 0.15, b: 0.15 } }];
    } else {
      navBar.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98 } }];
    }
    
    // Add title to navigation bar
    const title = figma.createText();
    title.characters = data.title || "Screen Title";
    title.fontSize = 18;
    title.fontName = { family: "Inter", style: "Bold" };
    
    // Center the title in the navigation bar
    title.x = navBar.width / 2 - title.width / 2;
    title.y = navBar.y + (navBar.height - title.height) / 2;
    
    // Apply theme to title
    if (theme === 'dark') {
      title.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    } else {
      title.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
    }
    
    // Add elements to the frame
    frame.appendChild(navBar);
    frame.appendChild(title);
    
    // Add content placeholder
    const contentPlaceholder = figma.createRectangle();
    contentPlaceholder.name = "Content Area";
    contentPlaceholder.x = 16;
    contentPlaceholder.y = navBar.height + 16;
    contentPlaceholder.resize(frame.width - 32, frame.height - navBar.height - 32);
    contentPlaceholder.cornerRadius = 8;
    
    // Apply theme to content placeholder
    if (theme === 'dark') {
      contentPlaceholder.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
    } else {
      contentPlaceholder.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }];
    }
    
    frame.appendChild(contentPlaceholder);
  } catch (error) {
    console.error("Error creating generic layout:", error);
    throw error;
  }
}

// Implement other layout helper functions as needed
async function createProfileLayout(libraryName, frame, theme, data) {
  // Implementation similar to createLoginLayout but for profile screens
  await createGenericLayout(libraryName, frame, theme, { title: "Profile" });
}

async function createSettingsLayout(libraryName, frame, theme, data) {
  // Implementation similar to createLoginLayout but for settings screens
  await createGenericLayout(libraryName, frame, theme, { title: "Settings" });
}

async function createOnboardingLayout(libraryName, frame, theme, data) {
  // Implementation similar to createLoginLayout but for onboarding screens
  await createGenericLayout(libraryName, frame, theme, { title: "Welcome" });
}

async function exportNodeAsImage(params) {
  const { nodeId, format = "PNG", scale = 1 } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  if (!("exportAsync" in node)) {
    throw new Error(`Node does not support exporting: ${nodeId}`);
  }

  try {
    const settings = {
      format: format,
      constraint: { type: "SCALE", value: scale },
    };

    const bytes = await node.exportAsync(settings);

    let mimeType;
    switch (format) {
      case "PNG":
        mimeType = "image/png";
        break;
      case "JPG":
        mimeType = "image/jpeg";
        break;
      case "SVG":
        mimeType = "image/svg+xml";
        break;
      case "PDF":
        mimeType = "application/pdf";
        break;
      default:
        mimeType = "application/octet-stream";
    }

    // Convert to base64
    const uint8Array = new Uint8Array(bytes);
    let binary = "";
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binary);
    const imageData = `data:${mimeType};base64,${base64}`;

    return {
      nodeId,
      format,
      scale,
      mimeType,
      imageData,
    };
  } catch (error) {
    throw new Error(`Error exporting node as image: ${error.message}`);
  }
}

async function executeCode(params) {
  const { code } = params || {};

  if (!code) {
    throw new Error("Missing code parameter");
  }

  try {
    // Execute the provided code
    // Note: This is potentially unsafe, but matches the Blender MCP functionality
    const executeFn = new Function(
      "figma",
      "selection",
      `
      try {
        const result = (async () => {
          ${code}
        })();
        return result;
      } catch (error) {
        throw new Error('Error executing code: ' + error.message);
      }
    `
    );

    const result = await executeFn(figma, figma.currentPage.selection);
    return { result };
  } catch (error) {
    throw new Error(`Error executing code: ${error.message}`);
  }
}

async function setCornerRadius(params) {
  const { nodeId, radius, corners } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  if (radius === undefined) {
    throw new Error("Missing radius parameter");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  // Check if node supports corner radius
  if (!("cornerRadius" in node)) {
    throw new Error(`Node does not support corner radius: ${nodeId}`);
  }

  // If corners array is provided, set individual corner radii
  if (corners && Array.isArray(corners) && corners.length === 4) {
    if ("topLeftRadius" in node) {
      // Node supports individual corner radii
      if (corners[0]) node.topLeftRadius = radius;
      if (corners[1]) node.topRightRadius = radius;
      if (corners[2]) node.bottomRightRadius = radius;
      if (corners[3]) node.bottomLeftRadius = radius;
    } else {
      // Node only supports uniform corner radius
      node.cornerRadius = radius;
    }
  } else {
    // Set uniform corner radius
    node.cornerRadius = radius;
  }

  return {
    id: node.id,
    name: node.name,
    cornerRadius: "cornerRadius" in node ? node.cornerRadius : undefined,
    topLeftRadius: "topLeftRadius" in node ? node.topLeftRadius : undefined,
    topRightRadius: "topRightRadius" in node ? node.topRightRadius : undefined,
    bottomRightRadius:
      "bottomRightRadius" in node ? node.bottomRightRadius : undefined,
    bottomLeftRadius:
      "bottomLeftRadius" in node ? node.bottomLeftRadius : undefined,
  };
}

async function setTextContent(params) {
  const { nodeId, text } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  if (text === undefined) {
    throw new Error("Missing text parameter");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  if (node.type !== "TEXT") {
    throw new Error(`Node is not a text node: ${nodeId}`);
  }

  try {
    await figma.loadFontAsync(node.fontName);
    
    await setCharacters(node, text);

    return {
      id: node.id,
      name: node.name,
      characters: node.characters,
      fontName: node.fontName
    };
  } catch (error) {
    throw new Error(`Error setting text content: ${error.message}`);
  }
}

// Initialize settings on load
(async function initializePlugin() {
  try {
    const savedSettings = await figma.clientStorage.getAsync("settings");
    if (savedSettings) {
      if (savedSettings.serverPort) {
        state.serverPort = savedSettings.serverPort;
      }
    }

    // Send initial settings to UI
    figma.ui.postMessage({
      type: "init-settings",
      settings: {
        serverPort: state.serverPort,
      },
    });
  } catch (error) {
    console.error("Error loading settings:", error);
  }
})();

function uniqBy(arr, predicate) {
  const cb = typeof predicate === "function" ? predicate : (o) => o[predicate];
  return [
    ...arr
      .reduce((map, item) => {
        const key = item === null || item === undefined ? item : cb(item);

        map.has(key) || map.set(key, item);

        return map;
      }, new Map())
      .values(),
  ];
}
const setCharacters = async (node, characters, options) => {
  const fallbackFont = (options && options.fallbackFont) || {
    family: "Inter",
    style: "Regular",
  };
  try {
    if (node.fontName === figma.mixed) {
      if (options && options.smartStrategy === "prevail") {
        const fontHashTree = {};
        for (let i = 1; i < node.characters.length; i++) {
          const charFont = node.getRangeFontName(i - 1, i);
          const key = `${charFont.family}::${charFont.style}`;
          fontHashTree[key] = fontHashTree[key] ? fontHashTree[key] + 1 : 1;
        }
        const prevailedTreeItem = Object.entries(fontHashTree).sort(
          (a, b) => b[1] - a[1]
        )[0];
        const [family, style] = prevailedTreeItem[0].split("::");
        const prevailedFont = {
          family,
          style,
        };
        await figma.loadFontAsync(prevailedFont);
        node.fontName = prevailedFont;
      } else if (options && options.smartStrategy === "strict") {
        return setCharactersWithStrictMatchFont(node, characters, fallbackFont);
      } else if (options && options.smartStrategy === "experimental") {
        return setCharactersWithSmartMatchFont(node, characters, fallbackFont);
      } else {
        const firstCharFont = node.getRangeFontName(0, 1);
        await figma.loadFontAsync(firstCharFont);
        node.fontName = firstCharFont;
      }
    } else {
      await figma.loadFontAsync({
        family: node.fontName.family,
        style: node.fontName.style,
      });
    }
  } catch (err) {
    console.warn(
      `Failed to load "${node.fontName["family"]} ${node.fontName["style"]}" font and replaced with fallback "${fallbackFont.family} ${fallbackFont.style}"`,
      err
    );
    await figma.loadFontAsync(fallbackFont);
    node.fontName = fallbackFont;
  }
  try {
    node.characters = characters;
    return true;
  } catch (err) {
    console.warn(`Failed to set characters. Skipped.`, err);
    return false;
  }
};

const setCharactersWithStrictMatchFont = async (
  node,
  characters,
  fallbackFont
) => {
  const fontHashTree = {};
  for (let i = 1; i < node.characters.length; i++) {
    const startIdx = i - 1;
    const startCharFont = node.getRangeFontName(startIdx, i);
    const startCharFontVal = `${startCharFont.family}::${startCharFont.style}`;
    while (i < node.characters.length) {
      i++;
      const charFont = node.getRangeFontName(i - 1, i);
      if (startCharFontVal !== `${charFont.family}::${charFont.style}`) {
        break;
      }
    }
    fontHashTree[`${startIdx}_${i}`] = startCharFontVal;
  }
  await figma.loadFontAsync(fallbackFont);
  node.fontName = fallbackFont;
  node.characters = characters;
  console.log(fontHashTree);
  await Promise.all(
    Object.keys(fontHashTree).map(async (range) => {
      console.log(range, fontHashTree[range]);
      const [start, end] = range.split("_");
      const [family, style] = fontHashTree[range].split("::");
      const matchedFont = {
        family,
        style,
      };
      await figma.loadFontAsync(matchedFont);
      return node.setRangeFontName(Number(start), Number(end), matchedFont);
    })
  );
  return true;
};

const getDelimiterPos = (str, delimiter, startIdx = 0, endIdx = str.length) => {
  const indices = [];
  let temp = startIdx;
  for (let i = startIdx; i < endIdx; i++) {
    if (
      str[i] === delimiter &&
      i + startIdx !== endIdx &&
      temp !== i + startIdx
    ) {
      indices.push([temp, i + startIdx]);
      temp = i + startIdx + 1;
    }
  }
  temp !== endIdx && indices.push([temp, endIdx]);
  return indices.filter(Boolean);
};

const buildLinearOrder = (node) => {
  const fontTree = [];
  const newLinesPos = getDelimiterPos(node.characters, "\n");
  newLinesPos.forEach(([newLinesRangeStart, newLinesRangeEnd], n) => {
    const newLinesRangeFont = node.getRangeFontName(
      newLinesRangeStart,
      newLinesRangeEnd
    );
    if (newLinesRangeFont === figma.mixed) {
      const spacesPos = getDelimiterPos(
        node.characters,
        " ",
        newLinesRangeStart,
        newLinesRangeEnd
      );
      spacesPos.forEach(([spacesRangeStart, spacesRangeEnd], s) => {
        const spacesRangeFont = node.getRangeFontName(
          spacesRangeStart,
          spacesRangeEnd
        );
        if (spacesRangeFont === figma.mixed) {
          const spacesRangeFont = node.getRangeFontName(
            spacesRangeStart,
            spacesRangeStart[0]
          );
          fontTree.push({
            start: spacesRangeStart,
            delimiter: " ",
            family: spacesRangeFont.family,
            style: spacesRangeFont.style,
          });
        } else {
          fontTree.push({
            start: spacesRangeStart,
            delimiter: " ",
            family: spacesRangeFont.family,
            style: spacesRangeFont.style,
          });
        }
      });
    } else {
      fontTree.push({
        start: newLinesRangeStart,
        delimiter: "\n",
        family: newLinesRangeFont.family,
        style: newLinesRangeFont.style,
      });
    }
  });
  return fontTree
    .sort((a, b) => +a.start - +b.start)
    .map(({ family, style, delimiter }) => ({ family, style, delimiter }));
};

const setCharactersWithSmartMatchFont = async (
  node,
  characters,
  fallbackFont
) => {
  const rangeTree = buildLinearOrder(node);
  const fontsToLoad = uniqBy(
    rangeTree,
    ({ family, style }) => `${family}::${style}`
  ).map(({ family, style }) => ({
    family,
    style,
  }));

  await Promise.all([...fontsToLoad, fallbackFont].map(figma.loadFontAsync));

  node.fontName = fallbackFont;
  node.characters = characters;

  let prevPos = 0;
  rangeTree.forEach(({ family, style, delimiter }) => {
    if (prevPos < node.characters.length) {
      const delimeterPos = node.characters.indexOf(delimiter, prevPos);
      const endPos =
        delimeterPos > prevPos ? delimeterPos : node.characters.length;
      const matchedFont = {
        family,
        style,
      };
      node.setRangeFontName(prevPos, endPos, matchedFont);
      prevPos = endPos + 1;
    }
  });
  return true;
};

// Group nodes into a single group
async function groupNodes(params) {
  const { nodeIds, name } = params;
  
  if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length < 2) {
    throw new Error("At least two node IDs are required to create a group");
  }
  
  // Get nodes by IDs
  const nodes = [];
  for (const id of nodeIds) {
    const node = figma.getNodeById(id);
    if (!node) {
      throw new Error(`Node with ID ${id} not found`);
    }
    nodes.push(node);
  }
  
  // Check if nodes can be grouped (they should have the same parent)
  const parent = nodes[0].parent;
  for (const node of nodes) {
    if (node.parent !== parent) {
      throw new Error("All nodes must have the same parent to be grouped");
    }
  }
  
  // Create group
  const group = figma.group(nodes, parent);
  if (name) {
    group.name = name;
  }
  
  return {
    id: group.id,
    name: group.name,
    type: group.type
  };
}

// Apply auto layout to a frame
async function createAutoLayout(params) {
  const { nodeId, direction, spacing, padding } = params;
  
  // Get the node by ID
  const node = figma.getNodeById(nodeId);
  if (!node) {
    throw new Error(`Node with ID ${nodeId} not found`);
  }
  
  // Check if node is a frame or component
  if (node.type !== "FRAME" && node.type !== "COMPONENT") {
    throw new Error("Auto layout can only be applied to frames or components");
  }
  
  // Apply auto layout
  node.layoutMode = direction;
  node.itemSpacing = spacing;
  
  // Apply padding
  if (padding) {
    node.paddingTop = padding.top;
    node.paddingRight = padding.right;
    node.paddingBottom = padding.bottom;
    node.paddingLeft = padding.left;
  }
  
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    layoutMode: node.layoutMode,
    itemSpacing: node.itemSpacing
  };
}

// Create a vector node from SVG path data
async function createVector(params) {
  const { pathData, x, y, fillColor, strokeColor, strokeWeight, name, parentId } = params;
  
  // Create vector
  const vector = figma.createVector();
  
  // Set name if provided
  if (name) {
    vector.name = name;
  }
  
  // Set position
  vector.x = x;
  vector.y = y;
  
  // Try to set path data (this is a simplified approach)
  try {
    // Note: this is a simplification - actual SVG path parsing would be more complex
    const path = figma.createVectorPath();
    path.data = pathData;
    vector.vectorPaths = [path];
  } catch (error) {
    throw new Error(`Invalid path data: ${error.message}`);
  }
  
  // Set fill color if provided
  if (fillColor) {
    const fill = {
      type: "SOLID",
      color: {
        r: fillColor.r,
        g: fillColor.g,
        b: fillColor.b
      },
      opacity: fillColor.a !== undefined ? fillColor.a : 1
    };
    vector.fills = [fill];
  }
  
  // Set stroke color and weight if provided
  if (strokeColor) {
    const stroke = {
      type: "SOLID",
      color: {
        r: strokeColor.r,
        g: strokeColor.g,
        b: strokeColor.b
      },
      opacity: strokeColor.a !== undefined ? strokeColor.a : 1
    };
    vector.strokes = [stroke];
    
    if (strokeWeight) {
      vector.strokeWeight = strokeWeight;
    }
  }
  
  // Add to parent if provided
  if (parentId) {
    const parent = figma.getNodeById(parentId);
    if (!parent || !("appendChild" in parent)) {
      throw new Error(`Cannot append to node with ID ${parentId}`);
    }
    parent.appendChild(vector);
  }
  
  return {
    id: vector.id,
    name: vector.name,
    type: vector.type
  };
}

// Create a boolean operation (union, subtract, etc.)
async function createBooleanOperation(params) {
  const { nodeIds, operation, name } = params;
  
  if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length < 2) {
    throw new Error("At least two node IDs are required for a boolean operation");
  }
  
  // Get nodes by IDs
  const nodes = [];
  for (const id of nodeIds) {
    const node = figma.getNodeById(id);
    if (!node) {
      throw new Error(`Node with ID ${id} not found`);
    }
    nodes.push(node);
  }
  
  // Create boolean operation
  let booleanOperation;
  
  switch (operation) {
    case "UNION":
      booleanOperation = figma.union(nodes, nodes[0].parent);
      break;
    case "SUBTRACT":
      booleanOperation = figma.subtract(nodes, nodes[0].parent);
      break;
    case "INTERSECT":
      booleanOperation = figma.intersect(nodes, nodes[0].parent);
      break;
    case "EXCLUDE":
      booleanOperation = figma.exclude(nodes, nodes[0].parent);
      break;
    default:
      throw new Error(`Unknown boolean operation: ${operation}`);
  }
  
  // Set name if provided
  if (name) {
    booleanOperation.name = name;
  }
  
  return {
    id: booleanOperation.id,
    name: booleanOperation.name,
    type: booleanOperation.type,
    operation: operation
  };
}

// Apply effect (shadow, blur) to a node
async function applyEffect(params) {
  const { nodeId, effectType, radius, color, offset } = params;
  
  // Get the node by ID
  const node = figma.getNodeById(nodeId);
  if (!node) {
    throw new Error(`Node with ID ${nodeId} not found`);
  }
  
  // Check if node supports effects
  if (!("effects" in node)) {
    throw new Error(`Node type ${node.type} does not support effects`);
  }
  
  // Create the effect object
  let effect = { type: effectType };
  
  // Set effect properties based on type
  switch (effectType) {
    case "DROP_SHADOW":
    case "INNER_SHADOW":
      if (!color) {
        throw new Error(`Color is required for ${effectType}`);
      }
      if (!offset) {
        throw new Error(`Offset is required for ${effectType}`);
      }
      
      effect.color = {
        r: color.r,
        g: color.g,
        b: color.b,
        a: color.a !== undefined ? color.a : 1
      };
      effect.offset = {
        x: offset.x,
        y: offset.y
      };
      effect.radius = radius;
      effect.visible = true;
      effect.blendMode = "NORMAL";
      break;
      
    case "LAYER_BLUR":
    case "BACKGROUND_BLUR":
      effect.radius = radius;
      effect.visible = true;
      break;
      
    default:
      throw new Error(`Unknown effect type: ${effectType}`);
  }
  
  // Apply the effect
  const effects = [...node.effects];
  effects.push(effect);
  node.effects = effects;
  
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    effectType: effectType
  };
}

// Create a component set (for variants)
async function createComponentSet(params) {
  const { components, name } = params;
  
  if (!components || !Array.isArray(components) || components.length < 1) {
    throw new Error("At least one component is required to create a component set");
  }
  
  // Get component nodes by IDs
  const componentNodes = [];
  for (const comp of components) {
    const node = figma.getNodeById(comp.nodeId);
    if (!node) {
      throw new Error(`Node with ID ${comp.nodeId} not found`);
    }
    
    // Check if node is a component
    if (node.type !== "COMPONENT") {
      throw new Error(`Node with ID ${comp.nodeId} is not a component`);
    }
    
    // Set component properties
    for (const [key, value] of Object.entries(comp.properties)) {
      // Note: In real implementation, we'd need to use the Figma API to set variant properties
      // This is a simplified version
      node.setRelaunchData({ [key]: value });
    }
    
    componentNodes.push(node);
  }
  
  // Create component set
  // Note: This is a simplified implementation. In reality, creating component sets
  // with variants requires more complex code
  const parent = componentNodes[0].parent;
  const componentSet = figma.combineAsVariants(componentNodes, parent);
  
  // Set name if provided
  if (name) {
    componentSet.name = name;
  }
  
  return {
    id: componentSet.id,
    name: componentSet.name,
    type: componentSet.type,
    childrenCount: componentSet.children.length
  };
}

// Set constraints for a node
async function setConstraints(params) {
  const { nodeId, horizontal, vertical } = params;
  
  // Get the node by ID
  const node = figma.getNodeById(nodeId);
  if (!node) {
    throw new Error(`Node with ID ${nodeId} not found`);
  }
  
  // Check if node supports constraints
  if (!("constraints" in node)) {
    throw new Error(`Node type ${node.type} does not support constraints`);
  }
  
  // Set constraints
  node.constraints = {
    horizontal,
    vertical
  };
  
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    constraints: {
      horizontal: node.constraints.horizontal,
      vertical: node.constraints.vertical
    }
  };
}
