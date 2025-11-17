# Build the project
npm run build

# Set environment variables and start the server
$env:SUPERVISORD_HOST="127.0.0.1"
$env:SUPERVISORD_PORT="9002"
$env:SUPERVISORD_COMMAND_DIR="E:\projects\refactor-the-project"
$env:SUPERVISORD_USERNAME="b18b935c-1551-4b6f-b70c-4d6a3e833adf"
$env:SUPERVISORD_PASSWORD="8tn6y2o8hthggug600eswffzpo5bke"
$env:SUPERVISORD_EXECUTABLE_PATH="E:\迅雷下载\supervisord_0.7.3_Windows_64-bit\supervisord_0.7.3_Windows_64-bit\supervisord.exe"
$env:CONFIG_FILE_PATH="E:\projects\refactor-the-project\supervisord.conf"
$env:MCP_PORT="30000"

npm run start