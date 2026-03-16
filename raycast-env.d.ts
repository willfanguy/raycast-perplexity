/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Perplexity API Key - Your Perplexity API key from perplexity.ai/settings/api */
  "apiKey": string,
  /** Default Model - Model used for Quick Ask */
  "defaultModel": "sonar" | "sonar-pro" | "sonar-reasoning-pro",
  /** Save History - Save queries and answers to local history */
  "saveHistory": boolean
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `quick-ask` command */
  export type QuickAsk = ExtensionPreferences & {}
  /** Preferences accessible in the `deep-research` command */
  export type DeepResearch = ExtensionPreferences & {}
  /** Preferences accessible in the `web-search` command */
  export type WebSearch = ExtensionPreferences & {}
  /** Preferences accessible in the `ask-selection` command */
  export type AskSelection = ExtensionPreferences & {}
  /** Preferences accessible in the `history` command */
  export type History = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `quick-ask` command */
  export type QuickAsk = {}
  /** Arguments passed to the `deep-research` command */
  export type DeepResearch = {}
  /** Arguments passed to the `web-search` command */
  export type WebSearch = {}
  /** Arguments passed to the `ask-selection` command */
  export type AskSelection = {}
  /** Arguments passed to the `history` command */
  export type History = {}
}

