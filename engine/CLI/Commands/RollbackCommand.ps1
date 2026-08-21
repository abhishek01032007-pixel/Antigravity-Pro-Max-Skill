# RollbackCommand.ps1 - State Snapshot Restorer

function Invoke-RollbackCommand {
    param(
        [psobject]$ParsedArgs
    )

    $targetPath = if ($ParsedArgs.Arguments.Count -gt 0) { $ParsedArgs.Arguments[0] } else { (Get-Location).Path }
    $resolved = Resolve-NexoraPath $targetPath

    Write-NexoraBanner
    Write-Host "Rollback Operation for: $resolved" -ForegroundColor Yellow
    Write-Host ""

    $snapshotId = if ($ParsedArgs.Flags.ContainsKey("snapshot")) { $ParsedArgs.Flags["snapshot"] } else { $null }
    $res = Restore-NexoraSnapshot -ProjectRoot $resolved -SnapshotId $snapshotId

    if ($res.success) {
        Write-NexoraSuccess "$($res.message)"
        return 0
    }
    else {
        Write-NexoraWarn "$($res.message)"
        return 0
    }
}
