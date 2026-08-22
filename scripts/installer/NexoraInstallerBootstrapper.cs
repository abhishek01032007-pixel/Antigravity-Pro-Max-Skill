using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Security.Cryptography;
using System.Text;

namespace Nexora.Installer
{
    public class Program
    {
        public const string PinnedVersion = "1.0.0";
        public const string ProductName = "Nexora Skills Manager";
        public const string RepoOwner = "abhishek01032007-pixel";
        public const string RepoName = "Nexora-Skills-Manager";
        public const string DesktopZipName = "NexoraSkillsManager-1.0.0-win-x64.zip";
        public const string RuntimeZipName = "NexoraRuntime-1.0.0.zip";
        public const string ExpectedDesktopSha = "88edae88834ef1e237291689045ef3b716e5d8d180228332e9790fb59312b773";
        public const string ExpectedRuntimeSha = "f30113528b036bedcbadeb67291dd3172386ffe9388af987bee6f4b4ce6de816";

        public static int Main(string[] args)
        {
            bool isSilent = false;
            bool isUninstall = false;
            bool isRepair = false;
            bool isForce = false;

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
                else if (lower == "force" || lower == "f")
                {
                    isForce = true;
                }
                else if (lower == "help" || lower == "h" || lower == "?")
                {
                    Console.WriteLine("Nexora Skills Manager Windows Setup Bootstrapper v" + PinnedVersion);
                    Console.WriteLine("Usage: NexoraSkillsManager-Setup-1.0.0.exe [--silent] [--uninstall] [--repair] [--force]");
                    return 0;
                }
            }

            if (isUninstall)
            {
                return PerformUninstall(isSilent, isForce);
            }

            return PerformInstall(isSilent, isRepair, isForce);
        }

        private static int PerformUninstall(bool isSilent, bool isForce)
        {
            try
            {
                string localApp = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string uninstallScript = Path.Combine(localApp, "NexoraSkillsManager", "runtime", "install", "uninstall.ps1");
                if (!File.Exists(uninstallScript))
                {
                    uninstallScript = Path.Combine(localApp, "NexoraSkillsManager", "install", "uninstall.ps1");
                }

                if (!File.Exists(uninstallScript))
                {
                    if (!isSilent)
                    {
                        Console.Error.WriteLine("[NexoraInstaller] Uninstall script not found in installed runtime. Removing registration.");
                    }
                    return 0;
                }

                string psArgs = string.Format("-NoProfile -ExecutionPolicy Bypass -File \"{0}\" {1}",
                    uninstallScript,
                    isForce ? "-Force" : "");

                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = "powershell.exe",
                    Arguments = psArgs,
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
                if (!isSilent) Console.Error.WriteLine("[NexoraInstaller] Uninstall error: " + ex.Message);
                return 1;
            }
        }

        private static int PerformInstall(bool isSilent, bool isRepair, bool isForce)
        {
            string tempStaging = Path.Combine(Path.GetTempPath(), "nexora-setup-" + Guid.NewGuid().ToString("N"));

            try
            {
                Directory.CreateDirectory(tempStaging);
                string baseDir = AppDomain.CurrentDomain.BaseDirectory;

                // 1. Resolve Runtime Package
                string runtimeZipPath = ResolvePackage(baseDir, RuntimeZipName, ExpectedRuntimeSha, tempStaging, isSilent);
                if (string.IsNullOrEmpty(runtimeZipPath) || !File.Exists(runtimeZipPath))
                {
                    if (!isSilent) Console.Error.WriteLine("[NexoraInstaller] Fatal: Runtime package could not be resolved or verified.");
                    return 1;
                }

                // 2. Resolve Desktop Package
                string desktopZipPath = ResolvePackage(baseDir, DesktopZipName, ExpectedDesktopSha, tempStaging, isSilent);
                if (string.IsNullOrEmpty(desktopZipPath) || !File.Exists(desktopZipPath))
                {
                    if (!isSilent) Console.Error.WriteLine("[NexoraInstaller] Fatal: Desktop package could not be resolved or verified.");
                    return 1;
                }

                // 3. Extract Runtime Package
                string runtimeExtractDir = Path.Combine(tempStaging, "runtime_pkg");
                Directory.CreateDirectory(runtimeExtractDir);
                ZipFile.ExtractToDirectory(runtimeZipPath, runtimeExtractDir);

                // Find root of runtime inside extraction
                string runtimeSourceRoot = runtimeExtractDir;
                if (Directory.Exists(Path.Combine(runtimeExtractDir, "runtime")))
                {
                    runtimeSourceRoot = Path.Combine(runtimeExtractDir, "runtime");
                }

                // 4. Extract Desktop Package
                string desktopExtractDir = Path.Combine(tempStaging, "desktop_pkg");
                Directory.CreateDirectory(desktopExtractDir);
                ZipFile.ExtractToDirectory(desktopZipPath, desktopExtractDir);

                // Find root of desktop inside extraction
                string desktopSourceRoot = desktopExtractDir;
                if (Directory.Exists(Path.Combine(desktopExtractDir, "win-unpacked")))
                {
                    desktopSourceRoot = Path.Combine(desktopExtractDir, "win-unpacked");
                }

                // 5. Locate Installer Engine
                string installerPs1 = Path.Combine(runtimeSourceRoot, "engine", "Install", "NexoraInstaller.ps1");
                if (!File.Exists(installerPs1))
                {
                    if (!isSilent) Console.Error.WriteLine("[NexoraInstaller] Fatal: NexoraInstaller.ps1 missing from extracted runtime payload: " + installerPs1);
                    return 1;
                }

                // 6. Execute Installer Engine
                string localApp = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string installRoot = Path.Combine(localApp, "NexoraSkillsManager", "runtime");
                string stateRoot = Path.Combine(localApp, "NexoraSkillsManager");
                string desktopRoot = Path.Combine(localApp, "Programs", "NexoraSkillsManager");
                string binDir = Path.Combine(localApp, "NexoraSkillsManager", "bin");

                StringBuilder psCommand = new StringBuilder();
                psCommand.Append("& { ");
                psCommand.AppendFormat(". '{0}'; ", installerPs1.Replace("'", "''"));
                psCommand.Append("Install-NexoraUnified ");
                psCommand.AppendFormat("-InstallRoot '{0}' ", installRoot.Replace("'", "''"));
                psCommand.AppendFormat("-StateRoot '{0}' ", stateRoot.Replace("'", "''"));
                psCommand.AppendFormat("-DesktopRoot '{0}' ", desktopRoot.Replace("'", "''"));
                psCommand.AppendFormat("-BinDir '{0}' ", binDir.Replace("'", "''"));
                psCommand.AppendFormat("-SourceDir '{0}' ", runtimeSourceRoot.Replace("'", "''"));
                psCommand.AppendFormat("-DesktopSourceDir '{0}' ", desktopSourceRoot.Replace("'", "''"));
                if (isSilent) psCommand.Append("-NonInteractive ");
                if (isForce || isRepair) psCommand.Append("-AllowDowngrade ");
                psCommand.Append("}");

                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = "powershell.exe",
                    Arguments = "-NoProfile -ExecutionPolicy Bypass -Command \"" + psCommand.ToString() + "\"",
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
                if (!isSilent) Console.Error.WriteLine("[NexoraInstaller] Installation exception: " + ex.Message);
                return 1;
            }
            finally
            {
                try
                {
                    if (Directory.Exists(tempStaging))
                    {
                        Directory.Delete(tempStaging, true);
                    }
                }
                catch { }
            }
        }

        private static string ResolvePackage(string baseDir, string zipName, string expectedSha, string tempDir, bool isSilent)
        {
            // A. Check sibling directory
            string sibling = Path.Combine(baseDir, zipName);
            if (File.Exists(sibling) && VerifySha(sibling, expectedSha))
            {
                return sibling;
            }

            // B. Check release directory relative to build tree
            string repoRel = Path.Combine(baseDir, "..", "release", zipName);
            if (File.Exists(repoRel) && VerifySha(repoRel, expectedSha))
            {
                return Path.GetFullPath(repoRel);
            }

            // C. Download from immutable GitHub release URL
            string downloadUrl = string.Format("https://github.com/{0}/{1}/releases/download/v{2}/{3}",
                RepoOwner, RepoName, PinnedVersion, zipName);

            string targetFile = Path.Combine(tempDir, zipName);
            if (!isSilent) Console.WriteLine("[NexoraInstaller] Downloading release payload: " + zipName);

            try
            {
                ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12 | SecurityProtocolType.Tls11 | SecurityProtocolType.Tls;
                using (WebClient client = new WebClient())
                {
                    client.Headers.Add("User-Agent", "Nexora-Setup-Bootstrapper/1.0.0");
                    client.DownloadFile(downloadUrl, targetFile);
                }

                if (File.Exists(targetFile) && VerifySha(targetFile, expectedSha))
                {
                    return targetFile;
                }
            }
            catch (Exception ex)
            {
                if (!isSilent) Console.Error.WriteLine("[NexoraInstaller] Download failed for " + zipName + ": " + ex.Message);
            }

            return null;
        }

        private static bool VerifySha(string filePath, string expectedSha)
        {
            try
            {
                using (FileStream fs = File.OpenRead(filePath))
                using (SHA256 sha = SHA256.Create())
                {
                    byte[] hash = sha.ComputeHash(fs);
                    StringBuilder sb = new StringBuilder();
                    foreach (byte b in hash)
                    {
                        sb.Append(b.ToString("x2"));
                    }
                    string computed = sb.ToString();
                    return string.Equals(computed, expectedSha, StringComparison.OrdinalIgnoreCase);
                }
            }
            catch
            {
                return false;
            }
        }
    }
}
