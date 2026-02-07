import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";


// Load .env.local manually (no extra dependency needed)
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env.local");
const envFile = readFileSync(envPath, "utf-8");
for (const line of envFile.split("\n")) {
 const [key, ...rest] = line.split("=");
 if (key && rest.length) {
   process.env[key.trim()] = rest.join("=").trim();
 }
}


const client = new Anthropic();


// -------------------------------------------------------------------
// Define your JSON schema as a "tool". Claude will return data matching
// this schema. Swap this out to test different structures.
// -------------------------------------------------------------------
const lessonPlanSchema: Anthropic.Tool = {
 name: "generate_lesson_plan",
 description:
   "Generate a structured lesson plan for learning a new skill based on the user's current level and goal level." + 
   "The lessons should increase" +
   " in complexity, going from beginner, intermediate, advanced, to expert. Provide enough"  +
   " lessons to master the skill and resources per lesson. Return the result using this tool." +
   " There can be branches down different paths of learning, so make sure to include connections between lessons. ",
 input_schema: {
   type: "object" as const,
   properties: {
     title: {
       type: "string",
       description: "Title of the lesson",
     },
     skill: {
       type: "string",
       description: "The skill being taught",
     },
     estimated_minutes: {
       type: "number",
       description: "Estimated time to complete in minutes",
     },
     objectives: {
       type: "array",
       items: { type: "string" },
       description: "Learning objectives",
     },
     lessons: {
       type: "array",
       items: {
         type: "object",
         properties: {
           lesson_number: { type: "number" },
           topic: { type: "string" },
           difficulty: {
             type: "string",
               enum: ["beginner", "intermediate", "advanced", "expert"],
               description: "Difficulty level",
           },
           description: { type: "string" },
           resources: {
             type: "array",
             items: { type: "string" },
             description: "Resources for the lesson based on the specific topic. Provide " +
             "a mix of resources such as articles, videos, and exercises as url links. Make sure these " +
             "resources are publicly accessible online. DO NOT REPEAT THE SAME RESOURCES FOR DIFFERENT LESSONS. " +
             "each lesson should have its own unique set of resources.",
           },
           duration_minutes: { type: "number" },
           connections: {
             type: "array",
             items: { type: "number" },
             description: "List of lesson numbers that are prerequisites for this lesson",
           }
         },
         required: ["lesson_number", "topic", "difficulty",
           "description", "resources", "duration_minutes", "connections"],
       },
       description: "Step-by-step lesson breakdown",
     },
   },
   required: [
     "title",
     "skill",
     "estimated_minutes",
     "objectives",
     "lessons",
   ],
 },
};


// -------------------------------------------------------------------
// Your prompt — change this to test different inputs
// -------------------------------------------------------------------
const userPrompt =
 "I want to learn how to play piano. I am a intermediate player and want to get to expert level.";


async function main() {
 console.log("Sending prompt to Claude...\n");
 console.log(`Prompt: "${userPrompt}"\n`);


 const response = await client.messages.create({
   model: "claude-opus-4-6",
   max_tokens: 8192,
   tools: [lessonPlanSchema],
   tool_choice: { type: "tool", name: "generate_lesson_plan" },
   messages: [{ role: "user", content: userPrompt }],
 });


 // Extract the tool use result
 const toolUseBlock = response.content.find(
   (block) => block.type === "tool_use"
 );


 if (toolUseBlock && toolUseBlock.type === "tool_use") {
   console.log("Structured JSON output:\n");
   console.log(JSON.stringify(toolUseBlock.input, null, 2));
 } else {
   console.log("No structured output returned. Raw response:");
   console.log(JSON.stringify(response.content, null, 2));
 }
}
