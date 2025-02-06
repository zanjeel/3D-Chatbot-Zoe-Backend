import { exec } from "child_process";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { promises as fs } from "fs";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly"; // AWS SDK v3 imports
dotenv.config();

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "-");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Initialize AWS Polly (v3)
const pollyClient = new PollyClient({
  region: process.env.AWS_REGION || "us-east-1", // Ensure the region is set
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const app = express();
app.use(express.json());
const port = process.env.PORT || 3000;

// const port = 3000;

// app.use(cors());

app.use(cors({
  origin: process.env.FRONTEND_URL || "*",  // Allow frontend URL
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// In-memory storage for each user's session
const userSessions = {}; // This will store chat history and session locks per user

// Helper function to get or initialize chat history for a user
const getUserChatHistory = (userId) => {
  if (!userSessions[userId]) {
    userSessions[userId] = {
      chatHistory: [],
      sessionLocked: false,
    };
  }
  return userSessions[userId];
};

// Helper function to add a message to user chat history
const addToUserChatHistory = (userId, role, message) => {
  const userSession = getUserChatHistory(userId);
  userSession.chatHistory.push({ role, message });
  // Limit chat history to the last 5 messages (adjust as needed)
  if (userSession.chatHistory.length > 5) {
    userSession.chatHistory.shift();
  }
};

// Lock and unlock user sessions to prevent overlapping requests
const lockUserSession = (userId) => {
  console.log("Locking session for user:", userId); // Added log
  return new Promise((resolve, reject) => {
    const userSession = getUserChatHistory(userId);
    if (userSession.sessionLocked) {
      console.error("Session already locked for user:", userId); // Log if already locked
      reject("Session is already in progress");
    } else {
      userSession.sessionLocked = true; // Lock the session
      console.log("Session locked for user:", userId); // Log when session is locked
      resolve();
    }
  });
};

const unlockUserSession = (userId) => {
  console.log("Unlocking session for user:", userId); // Added log
  const userSession = getUserChatHistory(userId);
  userSession.sessionLocked = false; // Unlock the session
};

app.get("/", (req, res) => {
  res.send("Hello World!");
});


const execCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(error);
      resolve(stdout);
    });
  });
};

const ffmpegPath = "./.local/bin/ffmpeg"; 
const rhubarbPath = "./.local/bin/Rhubarb-Lip-Sync-1.13.0-Linux/rhubarb";
// const ffmpegPath = process.env.FFMPEG_PATH;
// const rhubarbPath = process.env.RHUBARB_PATH;


// Check if the files are accessible
fs.access(ffmpegPath, fs.constants.F_OK)
.then(() => {
  console.log(`index.js: Using FFmpeg at: ${ffmpegPath}`);
})
.catch(() => {
  console.error("FFmpeg not found or inaccessible.");
});

fs.access(rhubarbPath, fs.constants.F_OK)
.then(() => {
  console.log(`index.js: Using Rhubarb at: ${rhubarbPath}`);
})
.catch(() => {
  console.error("Rhubarb not found or inaccessible.");
});


const lipSyncMessage = async (userId, messageIndex) => { 
  const time = new Date().getTime();
  console.log(`Starting conversion for message ${messageIndex} of user ${userId}`);
  
  // Convert mp3 to wav using ffmpeg
  await execCommand(`"${ffmpegPath}" -y -i "audios/${userId}_message_${messageIndex}.mp3" "audios/${userId}_message_${messageIndex}.wav"`);
  
  console.log(`Conversion done in ${new Date().getTime() - time}ms`);

  // Perform lip sync using Rhubarb
  await execCommand(`"${rhubarbPath}" -f json -o "audios/${userId}_message_${messageIndex}.json" "audios/${userId}_message_${messageIndex}.wav" -r phonetic`);

  console.log(`Lip sync done in ${new Date().getTime() - time}ms`);
};

// Extract JSON from Gemini response (handles Markdown code blocks)
const extractJsonFromResponse = (response) => {
  try {
    // Remove Markdown code block syntax (```json and ```)
    const cleanedResponse = response.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanedResponse);
  } catch (error) {
    console.error("Failed to extract JSON from response:", error);
    return null;
  }
};

// Function to generate speech using Amazon Polly (v3)
const textToSpeechPolly = async (text, fileName) => {
  const params = {
    Text: text,
    OutputFormat: "mp3",
    VoiceId: "Joanna", // You can change the voice (e.g., "Matthew", "Joanna")
  };

  const command = new SynthesizeSpeechCommand(params);

  try {
    const data = await pollyClient.send(command); // Using `send` method for v3
    await fs.writeFile(fileName, data.AudioStream, "binary");
  } catch (err) {
    console.error("Error synthesizing speech with Polly:", err);
    throw err; // Reject if error occurs
  }
};

app.post("/chat", async (req, res) => {
  console.log("Received chat request:", req.body); // Log incoming request
  const userMessage = req.body.message;
  const messageType = req.body.messageType;
  const userId = req.body.userId || "default"; // Use userId to track chat history

  console.log(userMessage);
  console.log(messageType);

  
  
    if (!userMessage && !messageType) {
      console.log("No message or message type provided, sending default response");
      res.send({
        messages: [
          {
            text: "You know you have to type words in that chatbox right?",
            audio: await audioFileToBase64("audios/introduction.wav"),
            lipsync: await readJsonTranscript("audios/introduction.json"),
            facialExpression: "default",
            animation: "Talking_1",
          },
        ],
      });
      return;
    }

    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || process.env.GOOGLE_API_KEY === "-") {
      console.log("Missing API keys, sending error response");
      res.send({
        messages: [
          {
            text: "Hey fellow developer, props to you for building this project! But you do have to get API keys. cheers!",
            audio: await audioFileToBase64("audios/apikeys.wav"),
            lipsync: await readJsonTranscript("audios/apikeys.json"),
            facialExpression: "angry",
            animation: "Angry",
          },
        ],
      });
      return;
    }

    if (messageType === "lifechoices") {  
      console.log("Template msg");
      res.send({
        messages: [
          {
            text: "Hey, I’m not saying your choices belong in a documentary titled ‘Questionable Life Decisions’, but let’s just say I’ve got a front-row seat and a bucket of popcorn.. Purely for research purposes, of course!",
            audio: await audioFileToBase64("audios/lifechoices.wav"),
            lipsync: await readJsonTranscript("audios/lifechoices.json"),
            facialExpression: "smile",
            animation: "Talking_1",
          },
        ],
      });
      return;
    }

    if (messageType === "overwhelming") {
      console.log("Template msg");
      res.send({
        messages: [
          {
            text: "Oh, love, I wish I had some grand secret, but honestly? I take it one ridiculously small step at a time...",
            audio: await audioFileToBase64("audios/overwhelming.wav"),
            lipsync: await readJsonTranscript("audios/overwhelming.json"),
            facialExpression: "default",
            animation: "Idle",
          },
        ],
      });
      return;
    }

    if (messageType === "sad") {
      console.log("Template msg");
      res.send({
        messages: [
          {
            text: "Alright, spill the beans. What's got you feeling like a soggy biscuit?",
            audio: await audioFileToBase64("audios/sad.wav"),
            lipsync: await readJsonTranscript("audios/sad.json"),
            facialExpression: "default",
            animation: "Rumba",
          },
        ],
      });
      return;
    }

    console.log("Adding user message to chat history:", userMessage);
    addToUserChatHistory(userId, "user", userMessage);

    console.log("Getting user chat history for user:", userId);
    const userChatHistory = getUserChatHistory(userId).chatHistory;

    console.log("Formatting user chat history into text");
    const chatHistoryText = userChatHistory.map((entry) => `${entry.role}: ${entry.message}`).join("\n");

    try {
          const prompt = `
          Chat History:
        ${chatHistoryText}
      
        You are a close friend who is helpful, empathetic sarcastic and carries conversations. You must remember the topic user is talking about and not repeat anything from the Chat History.
        Rules:
        1. Do NOT start new messages with any repetitive phrase or starting words present in Chat History.
        2. Do NOT end any sentence with "isn't it" or similar repetitive present in Chat History.
        3. Keep responses short and concise (maximum 2-3 sentences).
        4. Avoid starting sentences with the same word or phrase.
        5. Do not use special characters like asterisks (*) or backticks (\`).
        6. Always reply with a JSON array of messages, with a maximum of 1 message.
        7. Each message must have text, facialExpression, and animation properties.
        8. The available facial expressions are: smile, sad, angry, surprised, and default.
        9. The available animations are: Talking_1, Crying, Laughing, Rumba, Idle, Terrified, and Angry.
      
        Chat History:
        ${chatHistoryText}
      
        User message: ${userMessage || "Hello"}
        `;
  
      console.log("Sending prompt to Gemini API:", prompt);
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      console.log("Received response from Gemini API:", responseText);

      let messages = extractJsonFromResponse(responseText);
      if (!messages) {
        console.error("Invalid response from Gemini API:", responseText);
        res.status(400).send({
          messages: [{
            text: "Whoops, I tried to generate some witty banter, but my circuits are feeling a bit fried. Let's give it another go, yeah?",
            audio: await audioFileToBase64("audios/error.wav"),
            lipsync: await readJsonTranscript("audios/error.json"),
            facialExpression: "surprised",
            animation: "Idle",
          }],
        });
        return;
      }

      if (messages.messages) {
        messages = messages.messages;
      }

      console.log("Adding bot response to chat history");
      messages.forEach((message) => {
        addToUserChatHistory(userId, "bot", message.text);
      });

      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        const fileName = `audios/${userId}_message_${i}.mp3`;
        console.log(`Converting text to speech for message ${i}: ${message.text}`);
        await textToSpeechPolly(message.text, fileName);
        await lipSyncMessage(userId, i);
        message.audio = await audioFileToBase64(fileName);
        message.lipsync = await readJsonTranscript(`audios/${userId}_message_${i}.json`);
      }

      console.log("Sending final response to user");
  res.send({ messages });
} catch (error) {
  console.error("Error generating response with API:", error);

  res.status(500).send({
    messages: [
      {
        text: "Whoops, I tried to generate some witty banter, but my circuits are feeling a bit fried. Let's give it another go, yeah?",
        audio: await audioFileToBase64("audios/error.wav"),
        lipsync: await readJsonTranscript("audios/error.json"),
        facialExpression: "sad",
        animation: "Idle",
      },
    ],
  });
}
});



const readJsonTranscript = async (file) => {
  const data = await fs.readFile(file, "utf8");
  return JSON.parse(data);
};

const audioFileToBase64 = async (file) => {
  const data = await fs.readFile(file);
  return data.toString("base64");
};

app.listen(port, () => {
  console.log(`BFF listening on port ${port}`);
});