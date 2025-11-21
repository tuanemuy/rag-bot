/**
 * JSON Type Definitions
 *
 * Generic type definitions for JSON values.
 * These types represent any valid JSON value according to the JSON specification.
 */

/**
 * JSON primitive types
 * Represents string, number, boolean, or null values
 */
export type JsonPrimitive = string | number | boolean | null;

/**
 * JSON object type
 * All properties are optional and can be any JSON value
 */
export type JsonObject = {
  [key in string]?: JsonValue;
};

/**
 * JSON array type
 * An array of any JSON values
 */
export type JsonArray = JsonValue[];

/**
 * JSON value type (recursive)
 * Represents any valid JSON value
 *
 * This is a union of:
 * - Primitive values (string, number, boolean, null)
 * - Objects (key-value pairs where values are JSON values)
 * - Arrays (ordered lists of JSON values)
 */
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
