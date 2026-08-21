# CommandParser.ps1 - Tokenizer and parser for CLI invocations

function Parse-NexoraArguments {
    param(
        [Parameter(Mandatory=$false)]
        [string[]]$RawArgs = @()
    )

    $result = [PSCustomObject]@{
        Command   = $null
        Arguments = [System.Collections.Generic.List[string]]::new()
        Flags     = @{}
        RawTokens = $RawArgs
    }

    if (-not $RawArgs -or $RawArgs.Count -eq 0) {
        return $result
    }

    $i = 0
    while ($i -lt $RawArgs.Count) {
        $token = $RawArgs[$i]

        if ($token.StartsWith("--")) {
            $key = $token.Substring(2).ToLower()
            if ($key -eq "help" -or $key -eq "h") {
                $result.Flags["help"] = $true
            }
            elseif ($key -eq "json") {
                $result.Flags["json"] = $true
            }
            elseif ($key -eq "activate") {
                $result.Flags["activate"] = $true
            }
            elseif ($key.Contains("=")) {
                $parts = $key.Split("=", 2)
                $result.Flags[$parts[0]] = $parts[1]
            }
            elseif ($i + 1 -lt $RawArgs.Count -and -not $RawArgs[$i + 1].StartsWith("-")) {
                $result.Flags[$key] = $RawArgs[$i + 1]
                $i++
            }
            else {
                $result.Flags[$key] = $true
            }
        }
        elseif ($token.StartsWith("-")) {
            $short = $token.Substring(1).ToLower()
            if ($short -eq "h" -or $short -eq "?") {
                $result.Flags["help"] = $true
            }
            elseif ($short -eq "v") {
                $result.Flags["version"] = $true
            }
            elseif ($short -eq "j") {
                $result.Flags["json"] = $true
            }
            else {
                $result.Flags[$short] = $true
            }
        }
        else {
            if ($null -eq $result.Command) {
                $result.Command = $token.ToLower()
            }
            else {
                $result.Arguments.Add($token)
            }
        }
        $i++
    }

    return $result
}
