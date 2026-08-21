#define MyAppName "Nexora Skills Manager"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Nexora Skills Manager"
#define MyAppExeName "Start-Nexora-Skills-Manager.bat"

[Setup]
AppId={{8A1F3C4B-67E2-491A-B80D-7613EF5C8921}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={localappdata}\NexoraSkillsManager\runtime
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
OutputDir=dist
OutputBaseFilename=Nexora-Skills-Manager-Setup-1.0.0
UninstallDisplayName=Nexora Skills Manager
SetupLogging=yes
ChangesEnvironment=yes

[Files]
Source: "Frontend-Pro-Max\*"; DestDir: "{app}\Frontend-Pro-Max"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "Backend-Pro-Max\*"; DestDir: "{app}\Backend-Pro-Max"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "QA-Debug-Pro-Max\*"; DestDir: "{app}\QA-Debug-Pro-Max"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "Fullstack-Extras\*"; DestDir: "{app}\Fullstack-Extras"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "Backend-Frameworks\*"; DestDir: "{app}\Backend-Frameworks"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "Loaders\*"; DestDir: "{app}\Loaders"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "engine\*"; DestDir: "{app}\engine"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "Start-Nexora-Skills-Manager.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "Start-Antigravity-Pro-Max.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "nexora-version.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "agpm-version.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "README.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "LICENSE"; DestDir: "{app}"; Flags: ignoreversion

[Registry]
Root: HKCU; Subkey: "Environment"; ValueType: expandsz; ValueName: "Path"; ValueData: "{code:GetUpdatedPath}"; Flags: preservestringtype
Root: HKCU; Subkey: "Environment"; ValueType: string; ValueName: "NEXORA_INSTALL_PATH"; ValueData: "{app}"; Flags: preservestringtype

[Code]
function GetCommandBin(Param: String): String;
begin
  Result := ExpandConstant('{localappdata}\NexoraSkillsManager\bin');
end;

function GetUpdatedPath(Param: String): String;
var
  CurrentPath: String;
  CommandBin: String;
begin
  CommandBin := GetCommandBin('');

  if RegQueryStringValue(HKCU, 'Environment', 'Path', CurrentPath) then
  begin
    if Pos(';' + Lowercase(CommandBin) + ';',
           ';' + Lowercase(CurrentPath) + ';') = 0 then
      Result := CurrentPath + ';' + CommandBin
    else
      Result := CurrentPath;
  end
  else
    Result := CommandBin;
end;

procedure CreateCommands;
var
  CommandBin: String;
  MetaDir: String;
  MetaFile: String;
  MetaJson: String;
  NexoraCommandFile: String;
  NexoraCommandText: String;
  AgpmCommandFile: String;
  AgpmCommandText: String;
begin
  CommandBin := GetCommandBin('');
  MetaDir := ExpandConstant('{localappdata}\NexoraSkillsManager');
  MetaFile := MetaDir + '\install.json';
  NexoraCommandFile := CommandBin + '\nexora.cmd';
  AgpmCommandFile := CommandBin + '\agpm.cmd';

  ForceDirectories(CommandBin);
  ForceDirectories(MetaDir);

  MetaJson :=
    '{' + #13#10 +
    '  "installPath": "' + ReplaceStr(ExpandConstant('{app}'), '\', '\\') + '",' + #13#10 +
    '  "version": "1.0.0",' + #13#10 +
    '  "engineEntry": "engine\\Core\\NexoraEngine.ps1",' + #13#10 +
    '  "launcherBatch": "Start-Nexora-Skills-Manager.bat",' + #13#10 +
    '  "installedAt": "2026-08-21T13:00:00.000Z",' + #13#10 +
    '  "installMethod": "inno_setup",' + #13#10 +
    '  "channel": "stable"' + #13#10 +
    '}';

  SaveStringToFile(MetaFile, MetaJson, False);

  NexoraCommandText :=
    '@echo off' + #13#10 +
    'setlocal EnableExtensions' + #13#10 +
    'call "' + ExpandConstant('{app}') +
    '\Start-Nexora-Skills-Manager.bat" %*' + #13#10 +
    'exit /b %ERRORLEVEL%' + #13#10;

  SaveStringToFile(NexoraCommandFile, NexoraCommandText, False);

  AgpmCommandText :=
    '@echo off' + #13#10 +
    'setlocal EnableExtensions' + #13#10 +
    'echo.' + #13#10 +
    'echo ===============================================================================' + #13#10 +
    'echo  [NOTICE] The ''agpm'' command has transitioned to ''nexora'' (Nexora Skills Manager).' + #13#10 +
    'echo           Please use ''nexora'' in the future. Forwarding command...' + #13#10 +
    'echo ===============================================================================' + #13#10 +
    'echo.' + #13#10 +
    'call "' + ExpandConstant('{app}') +
    '\Start-Nexora-Skills-Manager.bat" %*' + #13#10 +
    'exit /b %ERRORLEVEL%' + #13#10;

  SaveStringToFile(AgpmCommandFile, AgpmCommandText, False);
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
    CreateCommands;
end;

procedure RemoveCommandBinFromUserPath;
var
  CurrentPath: String;
  CommandBin: String;
  Remaining: String;
  Item: String;
  P: Integer;
begin
  CommandBin := Lowercase(GetCommandBin(''));

  if RegQueryStringValue(HKCU, 'Environment', 'Path', CurrentPath) then
  begin
    Remaining := '';

    while Length(CurrentPath) > 0 do
    begin
      P := Pos(';', CurrentPath);

      if P > 0 then
      begin
        Item := Copy(CurrentPath, 1, P - 1);
        Delete(CurrentPath, 1, P);
      end
      else
      begin
        Item := CurrentPath;
        CurrentPath := '';
      end;

      if Lowercase(RemoveBackslashUnlessRoot(Item)) <> Lowercase(RemoveBackslashUnlessRoot(CommandBin)) then
      begin
        if Item <> '' then
        begin
          if Remaining <> '' then
            Remaining := Remaining + ';';

          Remaining := Remaining + Item;
        end;
      end;
    end;

    RegWriteExpandStringValue(HKCU, 'Environment', 'Path', Remaining);
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  NexoraCommandFile: String;
  AgpmCommandFile: String;
  MetaFile: String;
begin
  if CurUninstallStep = usPostUninstall then
  begin
    NexoraCommandFile := ExpandConstant('{localappdata}\NexoraSkillsManager\bin\nexora.cmd');
    AgpmCommandFile := ExpandConstant('{localappdata}\NexoraSkillsManager\bin\agpm.cmd');
    MetaFile := ExpandConstant('{localappdata}\NexoraSkillsManager\install.json');

    if FileExists(NexoraCommandFile) then DeleteFile(NexoraCommandFile);
    if FileExists(AgpmCommandFile) then DeleteFile(AgpmCommandFile);
    if FileExists(MetaFile) then DeleteFile(MetaFile);

    RemoveCommandBinFromUserPath;
    RegDeleteValue(HKCU, 'Environment', 'NEXORA_INSTALL_PATH');
  end;
end;
