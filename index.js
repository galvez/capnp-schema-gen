
export function generateDefinitions(rootName, json) {
  const structsBySignature = new Map()
  const structDefinitions = new Map()
  

  if (Array.isArray(json)) {
    return generateSchema(rootName, {
      [`${rootName}Item`]: findRepresentativeItem(json)
    })
  }
  
  analyzeStructure(json, rootName, structsBySignature)
  processObject(json, rootName, structsBySignature, structDefinitions)

  return structDefinitions
}

export function generateSchema (rootName, json) {
  const structDefinitions = generateDefinitions(rootName, json)
  const schemaId = "0x" + generateSchemaId(16)

  let schema = `@${schemaId};\n\n`
  
  // Add the root struct first
  if (structDefinitions.has(rootName)) {
    schema += structDefinitions.get(rootName) + '\n\n'
  }
  
  // Add all other structs
  for (const [name, definition] of structDefinitions.entries()) {
    if (name !== rootName) {
      schema += definition + '\n\n'
    }
  }

  return schema.trim()
}

// Generate the setter function for the Cap'n Proto schema
export function generateSetterFunction(json) {
  let code = `function setter(capnp, schemaClass, data) {
  const message = new capnp.Message();
  const obj = message.initRoot(schemaClass);
${
  generateSetterBody(json, 'obj', 'data', 2)
}  return message.toArrayBuffer();
}`;

  return code
}

function generateSetterBody(obj, objVarName, dataVarName, indentLevel, depth = 0) {
  if (obj === null || typeof obj !== 'object') {
    return ''
  }
  
  const indent = ' '.repeat(indentLevel)
  let code = ''
  
  const getIteratorName = (depth) => {
    if (depth === 0) return 'i'
    return `i${depth + 1}`
  }

  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      const hasComplexItems = hasComplexElementsInArray(value)
      
      if (hasComplexItems) {
        const listVarName = `${key}List`
        const iteratorName = getIteratorName(depth)

        code += `${indent}const ${listVarName} = ${objVarName}._init${capitalize(key)}(${dataVarName}.${key}.length);\n`
        code += `${indent}for (let ${iteratorName} = 0; ${iteratorName} < ${dataVarName}.${key}.length; ${iteratorName}++) {\n`
        code += `${indent}${indent}if (${dataVarName}.${key}[${iteratorName}] !== null && typeof ${dataVarName}.${key}[${iteratorName}] === 'object') {\n`

        const itemVarName = `${key}Item`
        code += `${indent}    const ${itemVarName} = ${listVarName}.get(${iteratorName});\n`
        
        const representativeItem = findRepresentativeItem(value)

        if (representativeItem !== null && typeof representativeItem === 'object') {
          code += generateSetterBody(representativeItem, itemVarName, `${dataVarName}.${key}[${iteratorName}]`, indentLevel + 4, depth + 1)
        }
        
        code += `${indent}${indent}}\n`
        code += `${indent}}\n`
      } else {
        // Primitives
        const iteratorName = getIteratorName(depth)
        code += `${indent}const ${key}List = ${objVarName}._init${capitalize(key)}(${dataVarName}.${key}.length);\n`
        code += `${indent}for (let ${iteratorName} = 0; ${iteratorName} < ${dataVarName}.${key}.length; ${iteratorName}++) {\n`
        code += `${indent}  ${key}List.set(${iteratorName}, ${dataVarName}.${key}[${iteratorName}]);\n`
        code += `${indent}}\n`
      }
    } else if (typeof value === 'object' && value !== null) {
      // Nested object
      const nestedObjName = `${key}Obj`
      code += `${indent}const ${nestedObjName} = ${objVarName}._init${capitalize(key)}();\n`
      code += generateSetterBody(value, nestedObjName, `${dataVarName}.${key}`, indentLevel, depth)
    } else {
      // Primitives
      code += `${indent}if (typeof ${dataVarName}.${key} !== 'undefined') {\n`
      code += `${indent}  ${objVarName}.${key} = ${dataVarName}.${key};\n`
      code += `${indent}}\n`
    }
  }
  
  return code
}

function findRepresentativeItem(array) {
  let mostComplex = null
  let maxProperties = 0
  const maxValues = {}

  for (const item of array) {
    if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
      const propertyCount = Object.keys(item).length
      if (propertyCount > maxProperties) {
        maxProperties = propertyCount
        mostComplex = item
      }

      for (const [key, value] of Object.entries(item)) {
        if (maxValues[key] === undefined || value > maxValues[key]) {
          maxValues[key] = value
        }
      }
    } else if (Array.isArray(item) && item.length > 0) {
      return item
    }
  }

  // If we found a complex object, 
  // update its properties with the highest values
  if (mostComplex !== null) {
    for (const key of Object.keys(mostComplex)) {
      if (maxValues[key] !== undefined) {
        mostComplex[key] = maxValues[key];
      }
    }
    return mostComplex;
  }

  // Otherwise, return the first non-null item
  for (const item of array) {
    if (item !== null) {
      return item
    }
  }

  // If all else fails, return the first item
  return array.length > 0 ? array[0] : null
}

function hasComplexElementsInArray(array) {
  return array.some(item => item !== null && typeof item === 'object')
}

function analyzeStructure(obj, path, structsBySignature) {
  if (obj === null || typeof obj !== 'object') {
    return
  }
  
  if (Array.isArray(obj)) {
    const combinedStructure = combineArrayItemStructures(obj)
    if (combinedStructure !== null) {
      analyzeStructure(combinedStructure, path + "Item", structsBySignature)
    }
    return
  }
  
  const signature = generateStructSignature(obj)
  
  if (structsBySignature.has(signature)) {
    return structsBySignature.get(signature)
  }
  
  structsBySignature.set(signature, path)
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        const combinedStructure = combineArrayItemStructures(value)
        if (combinedStructure !== null) {
          analyzeStructure(combinedStructure, `${path}${capitalize(key)}Item`, structsBySignature)
        }
      } else {
        analyzeStructure(value, `${path}${capitalize(key)}`, structsBySignature)
      }
    }
  }
}

function combineArrayItemStructures(array) {
  if (array.length === 0) {
    return null
  }
  
  if (!hasComplexElementsInArray(array)) {
    return null;
  }
  
  const objectItems = array.filter((item) => {
    return item !== null && typeof item === 'object' && !Array.isArray(item)
  })
  
  // If we have object items, combine their structures
  if (objectItems.length > 0) {
    const combined = {}
    
    for (const item of objectItems) {
      for (const [key, value] of Object.entries(item)) {
        if (!(key in combined)) {
          combined[key] = value
        } else {
          const existingType = typeof combined[key]
          const newType = typeof value
          
          if (existingType === 'object' && newType === 'object') {
            if (!Array.isArray(combined[key]) && !Array.isArray(value)) {
              combined[key] = { ...combined[key], ...value }
            } else if (Array.isArray(combined[key]) && Array.isArray(value)) {
              const combinedHasComplex = hasComplexElementsInArray(combined[key])
              const valueHasComplex = hasComplexElementsInArray(value)
              
              if (!combinedHasComplex && valueHasComplex) {
                combined[key] = value
              }
            }
          }
        }
      }
    }
    
    return combined
  }
  
  const arrayItems = array.filter(item => Array.isArray(item))
  
  if (arrayItems.length > 0) {
    let mostComplex = arrayItems[0]
    let maxComplexity = hasComplexElementsInArray(mostComplex) ? 1 : 0
    
    for (let i = 1; i < arrayItems.length; i++) {
      const complexity = hasComplexElementsInArray(arrayItems[i]) ? 1 : 0
      if (complexity > maxComplexity || (complexity === maxComplexity && arrayItems[i].length > mostComplex.length)) {
        mostComplex = arrayItems[i]
        maxComplexity = complexity
      }
    }
    
    return mostComplex
  }
  
  return array[0]
}

// Generate a unique signature for an object structure
function generateStructSignature(obj) {
  const fields = [];
  
  for (const [key, value] of Object.entries(obj)) {
    let fieldType;
    
    if (Array.isArray(value)) {
      if (value.length > 0) {
        if (hasComplexElementsInArray(value)) {
          // It's an array of complex items
          const combinedStructure = combineArrayItemStructures(value);
          if (combinedStructure !== null && typeof combinedStructure === 'object') {
            const itemSignature = Array.isArray(combinedStructure) 
              ? 'Array' 
              : generateStructSignature(combinedStructure);
            fieldType = `List<${itemSignature}>`
          } else {
            fieldType = 'List<AnyPointer>'
          }
        } else {
          // It's an array of primitives
          fieldType = `List<${typeof value[0]}>`
        }
      } else {
        // Empty array
        fieldType = 'List<Void>'
      }
    } else if (typeof value === 'object' && value !== null) {
      // It's a nested object
      fieldType = generateStructSignature(value)
    } else {
      // It's a primitive
      fieldType = typeof value
    }
    
    fields.push(`${key}:${fieldType}`)
  }
  
  // Sort fields for consistent signatures regardless of field order
  return fields.sort().join('|')
}

function processObject(obj, name, structsBySignature, structDefinitions) {
  if (obj === null || typeof obj !== 'object' || structDefinitions.has(name)) {
    return name
  }
  
  if (Array.isArray(obj)) {
    if (hasComplexElementsInArray(obj)) {
      const combinedStructure = combineArrayItemStructures(obj);
      if (combinedStructure !== null && typeof combinedStructure === 'object' && !Array.isArray(combinedStructure)) {
        return `List(${processObject(combinedStructure, name + "Item", structsBySignature, structDefinitions)})`
      } else {
        return 'List(AnyPointer)'
      }
    } else {
      const primitiveType = obj.length > 0 ? getCapnProtoType(obj[0]) : 'Void'
      return `List(${primitiveType})`
    }
  }
  
  const signature = generateStructSignature(obj)
  
  const existingPath = structsBySignature.get(signature)
  if (existingPath && structDefinitions.has(existingPath)) {
    return existingPath
  }
  
  const fields = []
  let fieldIndex = 0
  
  for (const [key, value] of Object.entries(obj)) {
    let fieldType
    
    if (Array.isArray(value)) {
      if (hasComplexElementsInArray(value)) {
        const combinedStructure = combineArrayItemStructures(value)
        if (combinedStructure !== null && typeof combinedStructure === 'object' && !Array.isArray(combinedStructure)) {
          const itemType = processObject(combinedStructure, `${name}${capitalize(key)}Item`, structsBySignature, structDefinitions)
          fieldType = `List(${itemType})`
        } else {
          fieldType = 'List(AnyPointer)'
        }
      } else {
        const primitiveType = value.length > 0 ? getCapnProtoType(value[0]) : 'Void'
        fieldType = `List(${primitiveType})`
      }
    } else if (typeof value === 'object' && value !== null) {
      fieldType = processObject(value, `${name}${capitalize(key)}`, structsBySignature, structDefinitions)
    } else {
      fieldType = getCapnProtoType(value)
    }
    
    fields.push(`${key} @${fieldIndex} :${fieldType};`)
    fieldIndex++
  }
  
  const structDef = `struct ${name} {\n  ${fields.join('\n  ')}\n}`
  structDefinitions.set(name, structDef)
  
  return name
}

const MIN_INT64 = BigInt("-9223372036854775808")
const MAX_INT64 = BigInt("9223372036854775807")

// Helper function to get the Cap'n Proto type for a JavaScript value
function getCapnProtoType(value) {
  if (value === null || value === undefined) {
    return 'Void'
  }
  
  switch (typeof value) {
    case 'number':
      if (Number.isInteger(value)) {
        if (BigInt(value) >= MIN_INT64 && BigInt(value) <= MAX_INT64) {
          return 'Int32'
        } else {
          return 'Int64'
        }
      } else {
        return 'Float64'
      }
    case 'boolean':
      return 'Bool'
    case 'string':
      return 'Text'
    case 'object':
      return 'AnyPointer'
    default:
      return 'Void'
  }
}

// Generate a random Cap'n Proto schema ID
function generateSchemaId() {
  const bytes = new Uint8Array(8)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Math.floor(Math.random() * 256)
  }
  bytes[0] |= 0x80
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

// Helper function to capitalize a string
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

