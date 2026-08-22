using System;
using System.Diagnostics;
using System.IO;

namespace Nexora.Installer
{
    public class Program
    {
        public static int Main(string[] args)
        {
            try
            {
                bool isSilent = false;
                bool isUninstall = false;
                bool isRepair = false;

                foreach (string arg in args)
                {
                    string lower = arg.ToLowerInvariant().Trim('-', '/');
                    if (lower == "silent" || lower == "s" || lower == "quiet" || lower == "q")
                    {
                        isSilent = true;
                    }
                    else if (lower == "uninstall" || lower == "u")
                    {
                        isUninstall = true;
                    }
                    else if (lower == "repair" || lower == "r")
                    {
                        isRepair = true;
                    }
                    else if (lower == "help" || lower == "h" || lower == "?")
                    {
                        Console.WriteLine("Nexora Skills Manager Windows Setup Bootstrapper");
                        Console.WriteLine("Usage: NexoraSkillsManager-Setup-1.0.0.exe [--silent] [--uninstall] [--repair]");
                        return 0;
                    }
                }

                // Resolve PowerShell installation script path or command
                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                string repoRoot = Path.GetFullPath(Path.Combine(baseDir, ".."));
                string setupPs1 = Path.Combine(baseDir, "setup.ps1");
                if (!File.Exists(setupPs1))
                {
                    setupPs1 = Path.Combine(repoRoot, "setup.ps1");
                }
                string uninstallPs1 = Path.Combine(baseDir, "uninstall.ps1");
                if (!File.Exists(uninstallPs1))
                {
                    uninstallPs1 = Path.Combine(repoRoot, "uninstall.ps1");
                }

                string scriptToRun = isUninstall ? uninstallPs1 : setupPs1;
                string psArguments;

                if (File.Exists(scriptToRun))
                {
                    string extraArgs = isSilent ? "-NonInteractive" : "";
                    if (isRepair)
                    {
                        extraArgs += " -Force";
                    }
                    psArguments = string.Format("-NoProfile -ExecutionPolicy Bypass -File \"{0}\" {1}", scriptToRun, extraArgs);
                }
                else
                {
                    // Fallback to online/bootstrap invocation if run standalone
                    string remoteCmd;
                    if (isUninstall)
                    {
                        remoteCmd = "irm https://raw.githubusercontent.com/abhishek01032007-pixel/Nexora-Skills-Manager/main/uninstall.ps1 | iex";
                    }
                    else
                    {
                        remoteCmd = "irm https://raw.githubusercontent.com/abhishek01032007-pixel/Nexora-Skills-Manager/main/setup.ps1 | iex";
                    }
                    psArguments = string.Format("-NoProfile -ExecutionPolicy Bypass -Command \"{0}\"", remoteCmd);
                }

                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = "powershell.exe",
                    Arguments = psArguments,
                    UseShellExecute = false,
                    CreateNoWindow = isSilent,
                    WindowStyle = isSilent ? ProcessWindowStyle.Hidden : ProcessWindowStyle.Normal
                };

                using (Process proc = Process.Start(psi))
                {
                    if (proc == null) return 1;
                    proc.WaitForExit();
                    return proc.ExitCode;
                }
            }
            catch (Exception ex)
            {
                if (!Array.Exists(args, a => a.ToLowerInvariant().Contains("silent")))
                {
                    Console.Error.WriteLine("[NexoraInstaller] Fatal error: " + ex.Message);
                }
                return 1;
            }
        }
    }
}
