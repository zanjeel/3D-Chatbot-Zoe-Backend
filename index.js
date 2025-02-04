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
app.use(cors());
const port = 3000;

// In-memory chat history storage
const chatHistory = {};

// Helper function to get or initialize chat history for a session
const getChatHistory = (sessionId) => {
  if (!chatHistory[sessionId]) {
    chatHistory[sessionId] = [];
  }
  return chatHistory[sessionId];
};

// Helper function to add a message to chat history
const addToChatHistory = (sessionId, role, message) => {
  const history = getChatHistory(sessionId);
  history.push({ role, message });
  // Limit chat history to the last 5 messages (adjust as needed)
  if (history.length > 5) {
    history.shift();
  }
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

const lipSyncMessage = async (message) => {
  const time = new Date().getTime();
  console.log(`Starting conversion for message ${message}`);
  await execCommand(
    `"C:\\ffmpeg\\bin\\ffmpeg.exe" -y -i audios/message_${message}.mp3 audios/message_${message}.wav`
  );
  console.log(`Conversion done in ${new Date().getTime() - time}ms`);
  await execCommand(
    `"C:\\rhubarb\\rhubarb.exe" -f json -o audios/message_${message}.json audios/message_${message}.wav -r phonetic`
  );
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
  const userMessage = req.body.message;
  const messageType = req.body.messageType;
  const sessionId = req.body.sessionId || "default"; // Use a session ID to track chat history

  console.log(userMessage);
  console.log(messageType);

  if (!userMessage && !messageType) {
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

  // Handle predefined message types
  if (messageType === "lifechoices") {
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
    res.send({
      messages: [
        {
          text: "Oh, love, I wish I had some grand secret, but honestly? I take it one ridiculously small step at a time. Some days, that step is just getting out of bed. Other days, it’s bribing myself with tea and sarcasm until I remember I’m actually quite capable. And when all else fails, I remind myself that even a total mess can unfold into something beautiful, we just haven't looked at the bigger picture yet",
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

  // Add user message to chat history
  addToChatHistory(sessionId, "user", userMessage);

  // Get chat history for the session
  const history = getChatHistory(sessionId);

  // Format chat history for the prompt
  const chatHistoryText = history
    .map((entry) => `${entry.role}: ${entry.message}`)
    .join("\n");

  // Use Google Gemini API for generating responses
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

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Extract JSON from the response
    let messages = extractJsonFromResponse(responseText);

    if (!messages) {
      console.error("Invalid response from Gemini API:", responseText);
      res.status(400).send({
        messages: [
          {
            text: "Whoops, I tried to generate some witty banter, but my circuits are feeling a bit fried. Let's give it another go, yeah?",
            audio: await audioFileToBase64("audios/error.wav"),
            lipsync: await readJsonTranscript("audios/error.json"),
            facialExpression: "surprised",
            animation: "Idle",
          },
        ],
      });
      return;
    }

    if (messages.messages) {
      messages = messages.messages; // Handle nested messages property
    }

    // Add bot response to chat history
    messages.forEach((message) => {
      addToChatHistory(sessionId, "bot", message.text);
    });

    // Generate audio and lip sync for each message
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const fileName = `audios/message_${i}.mp3`;
      const textInput = message.text;
      await textToSpeechPolly(textInput, fileName); // Use Amazon Polly instead of ElevenLabs
      await lipSyncMessage(i);
      message.audio = await audioFileToBase64(fileName);
      message.lipsync = await readJsonTranscript(`audios/message_${i}.json`);
    }

    res.send({ messages });
  } catch (error) {
    console.error("Error generating response with API:", error);

    res.status(500).send({
      messages: [
        {
          text: "Whoops, I tried to generate some witty banter, but my circuits are feeling a bit fried. Let's give it another go, yeah?",
          audio: await audioFileToBase64("audios/error.wav"),
          lipsync: await readJsonTranscript("audios/error.json"),
          facialExpression: "surprised",
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