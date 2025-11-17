# NSSM 安装 supervisor-mcp-server 服务脚本
&"E:\迅雷下载\nssm-2.24-101-g897c7ad\nssm-2.24-101-g897c7ad\win64\nssm.exe" install SupervisorMCPServer "C:\Program Files\nodejs\node.exe"
&"E:\迅雷下载\nssm-2.24-101-g897c7ad\nssm-2.24-101-g897c7ad\win64\nssm.exe" set SupervisorMCPServer AppParameters "dist/server.js"
&"E:\迅雷下载\nssm-2.24-101-g897c7ad\nssm-2.24-101-g897c7ad\win64\nssm.exe" set SupervisorMCPServer AppDirectory "c:\Users\Administrator\Downloads\package (5)\supervisor-mcp-server"
&"E:\迅雷下载\nssm-2.24-101-g897c7ad\nssm-2.24-101-g897c7ad\win64\nssm.exe" set SupervisorMCPServer AppExit Default Restart
&"E:\迅雷下载\nssm-2.24-101-g897c7ad\nssm-2.24-101-g897c7ad\win64\nssm.exe" set SupervisorMCPServer AppEnvironmentExtra "SUPERVISORD_HOST=127.0.0.1" "SUPERVISORD_PORT=9002" "SUPERVISORD_COMMAND_DIR=E:\projects\refactor-the-project" "SUPERVISORD_USERNAME=b18b935c-1551-4b6f-b70c-4d6a3e833adf" "SUPERVISORD_PASSWORD=8tn6y2o8hthggug600eswffzpo5bke" "SUPERVISORD_EXECUTABLE_PATH=E:\迅雷下载\supervisord_0.7.3_Windows_64-bit\supervisord_0.7.3_Windows_64-bit\supervisord.exe" "CONFIG_FILE_PATH=E:\projects\refactor-the-project\supervisord.conf" "MCP_PORT=30000"
&"E:\迅雷下载\nssm-2.24-101-g897c7ad\nssm-2.24-101-g897c7ad\win64\nssm.exe" set SupervisorMCPServer AppStdout "c:\Users\Administrator\Downloads\package (5)\supervisor-mcp-server\logs\supervisor-mcp-server.out.log"
&"E:\迅雷下载\nssm-2.24-101-g897c7ad\nssm-2.24-101-g897c7ad\win64\nssm.exe" set SupervisorMCPServer AppStderr "c:\Users\Administrator\Downloads\package (5)\supervisor-mcp-server\logs\supervisor-mcp-server.err.log"
&"E:\迅雷下载\nssm-2.24-101-g897c7ad\nssm-2.24-101-g897c7ad\win64\nssm.exe" set SupervisorMCPServer Description "Supervisor MCP Server - Model Context Protocol server for supervisord process management"
&"E:\迅雷下载\nssm-2.24-101-g897c7ad\nssm-2.24-101-g897c7ad\win64\nssm.exe" set SupervisorMCPServer DisplayName "Supervisor MCP Server"
&"E:\迅雷下载\nssm-2.24-101-g897c7ad\nssm-2.24-101-g897c7ad\win64\nssm.exe" set SupervisorMCPServer ObjectName LocalSystem
&"E:\迅雷下载\nssm-2.24-101-g897c7ad\nssm-2.24-101-g897c7ad\win64\nssm.exe" set SupervisorMCPServer Start SERVICE_AUTO_START
&"E:\迅雷下载\nssm-2.24-101-g897c7ad\nssm-2.24-101-g897c7ad\win64\nssm.exe" set SupervisorMCPServer Type SERVICE_WIN32_OWN_PROCESS