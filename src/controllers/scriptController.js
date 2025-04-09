const { spawn } = require('child_process');
const path = require('path');

exports.runScript = async (req, res) => {
  const { prompt } = req.body;

  console.log("Received prompt:", prompt);

  if (!prompt) {
    return res.status(400).json({
      response: "I didn't receive any message. Please try again.",
      error: "Missing prompt"
    });
  }

  // Correctly locate the Python script - use the direct file path
  const scriptPath = path.resolve(__dirname, "../../inf.py");
  console.log("Using Python script at:", scriptPath);

  // Use explicit Python executable path for Windows
  const pythonProcess = spawn("python", [scriptPath]);

  // Send prompt to Python script via stdin with proper encoding
  pythonProcess.stdin.write(JSON.stringify({ prompt }));
  pythonProcess.stdin.end();

  let output = "";
  let errorOutput = "";

  // Set timeout for the Python process (30 seconds)
  const timeout = setTimeout(() => {
    console.log("Python process timed out after 30 seconds");
    pythonProcess.kill();
    return res.status(504).json({
      response: "I'm sorry, the request timed out. Please try again with a shorter message.",
      error: "Request timed out"
    });
  }, 3000000);

  // Capture Python output
  pythonProcess.stdout.on("data", (data) => {
    output += data.toString();
    console.log("Python output chunk received:", data.toString().substring(0, 100) + "...");
  });

  pythonProcess.stderr.on("data", (data) => {
    errorOutput += data.toString();
    console.error("Python error:", data.toString());
  });

  pythonProcess.on("close", (code) => {
    // Clear the timeout since the process completed
    clearTimeout(timeout);

    console.log(`Python process exited with code ${code}`);
    console.log("Full output:", output);

    if (code !== 0) {
      console.error("Python script error. Exit code:", code);
      console.error("Error output:", errorOutput);

      return res.json({
        response: "I'm sorry, I encountered an error processing your request. Please try again with a different query.",
        error: errorOutput || "Unknown error",
        code: code
      });
    }

    try {
      const result = JSON.parse(output);
      res.json(result); 
    } catch (error) {
      console.error("Error parsing Python output:", error);
      console.error("Raw output:", output);

      // Send a default response rather than an error status
      res.json({
        response: "I'm sorry, I couldn't generate a proper response. Please try again with a different question.",
        error: "Failed to parse Python output"
      });
    }
  });

  pythonProcess.on("error", (error) => {
    // Clear the timeout since the process failed to start
    clearTimeout(timeout);

    console.error(`Failed to start Python script: ${error.message}`);

    res.json({
      response: "I'm sorry, there was a technical issue. Please try again later.",
      error: "Failed to execute Python script: " + error.message
    });
  });
};