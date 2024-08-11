import OpenAI from "openai";
import Anthropic from '@anthropic-ai/sdk';
import { requestUrl, RequestUrlParam } from "obsidian";
import { request } from "http";

export type LLMClient = OpenAI | Anthropic;

async function callGptApi(gptClient: OpenAI, modelName: string, chunk: string, prompt: string) {
    if (modelName === "") {
        throw new Error("Model name is required");
    }
    try {
        const response = await gptClient.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: prompt
                },
                {
                    role: "user",
                    content: chunk
                }
            ],
            model: modelName
        });
        return response.choices[0].message.content;
    } catch (e) {
        return `Error: ${e}`;
    }
}

async function callClaudeApi(
    apiKey: string,
    modelName: string,
    chunk: string,
    prompt: string
  ) {
    const url = 'https://api.anthropic.com/v1/messages';
  
    try {
      const body = JSON.stringify({
        model: modelName,
        max_tokens: chunk.length,
        system: prompt,
        messages: [
          {
            role: "user",
            content: chunk
          }
        ]
      });
      
      const response = await requestUrl({
        url,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: body
      });
  
      if (!response.status || response.status < 200 || response.status >= 300) {
        throw new Error(`HTTP error! status: ${response.status}, body: ${response.text}`);
      }
      const data = await response.json;

      return data.content[0].type === "text" ? data.content[0].text : "Error: Claude API response is not text";
    
    } catch (e) {
      console.error("Caught error:", e);
      throw e;
    }
  }  
  
  
export { callGptApi, callClaudeApi };