import json
import time
import sys
import traceback

print("Python script started", file=sys.stderr)

try:
    import modelbit  # Ensure modelbit is correctly installed
    print("Modelbit import successful", file=sys.stderr)
except ImportError as e:
    print(f"Error importing modelbit: {str(e)}", file=sys.stderr)
    print(json.dumps({
        "response": "I'm sorry, there's a technical issue with the AI service. Please try again later.",
        "error": f"Modelbit import error: {str(e)}"
    }))
    sys.exit(1)

def generate_response(prompt):
    try:
        print(f"Generating response for: {prompt[:50]}...", file=sys.stderr)
        curr_time = time.time()

        # Call the modelbit inference
        response = modelbit.get_inference(
            region="us-east-2.aws",
            workspace="adarshmishra",
            deployment="run_inference_v2",
            data=prompt
        )
        print("Modelbit inference completed", file=sys.stderr)

        inference_time = time.time()
        total_elapsed = inference_time - curr_time

        if isinstance(response, dict):
            response_text = response.get("data", "")
            print(f"Response is a dict, extracted 'data' field", file=sys.stderr)
        else:
            response_text = response
            print(f"Response is a string, length: {len(str(response))}", file=sys.stderr)

        if not response_text:
            print("Warning: Empty response from modelbit", file=sys.stderr)
            return {
                "response": "I apologize, but I couldn't generate a response to your question. Please try asking in a different way.",
                "elapsed_time": total_elapsed
            }

        print(f"Response generated successfully in {total_elapsed:.2f}s", file=sys.stderr)
        return {
            "response": response_text,
            "elapsed_time": total_elapsed
        }
    except Exception as e:
        error_details = traceback.format_exc()
        print(f"Error in generate_response: {str(e)}\n{error_details}", file=sys.stderr)
        return {
            "response": "I'm sorry, I encountered an error infff processing your request. Please try again later.",
            "error": str(e)
        }

if __name__ == "__main__":
    try:
        print("Reading input from stdin...", file=sys.stderr)
        input_data = sys.stdin.read()
        print(f"Received input length: {len(input_data)}", file=sys.stderr)
        
        if not input_data:
            print("Error: Empty input received", file=sys.stderr)
            print(json.dumps({
                "response": "I didn't receive any input to process. Please try again.",
                "error": "Empty input"
            }))
            sys.exit(1)
            
        data = json.loads(input_data)
        prompt = data.get("prompt")
        
        if not prompt:
            print("Error: No prompt field in input", file=sys.stderr)
            print(json.dumps({
                "response": "I didn't receive a proper message to respond to. Please try again.",
                "error": "No prompt provided"
            }))
            sys.exit(1)
            
        print(f"Processing prompt: {prompt[:50]}...", file=sys.stderr)
        result = generate_response(prompt)
        print(json.dumps(result))
        print("Response sent successfully", file=sys.stderr)
        
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {str(e)}", file=sys.stderr)
        print(json.dumps({
            "response": "There was a problem processing your request. Please try again.",
            "error": f"Invalid JSON input: {str(e)}"
        }))
        sys.exit(1)
    except Exception as e:
        error_details = traceback.format_exc()
        print(f"Unexpected error: {str(e)}\n{error_details}", file=sys.stderr)
        print(json.dumps({
            "response": "Sorry, an unexpected error occurred. Please try again later.",
            "error": str(e)
        }))
        sys.exit(1)
    