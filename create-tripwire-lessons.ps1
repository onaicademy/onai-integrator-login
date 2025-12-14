$headers = @{ "Content-Type" = "application/json" }

# Module 16 (Первый модуль Tripwire) - 3 пустых урока
Write-Host "Creating lessons in Module 16 (Tripwire Module 1)..."
$module1 = @(
    @{ module_id = 16; title = "Урок 1.1 - Модуль 1"; description = "" },
    @{ module_id = 16; title = "Урок 1.2 - Модуль 1"; description = "" },
    @{ module_id = 16; title = "Урок 1.3 - Модуль 1"; description = "" }
)

foreach ($lesson in $module1) {
    try {
        $body = $lesson | ConvertTo-Json
        $response = Invoke-WebRequest -Uri "https://api.onai.academy/api/tripwire/lessons" `
            -Method POST `
            -Headers $headers `
            -Body $body `
            -ContentType "application/json" `
            -ErrorAction Stop
        $result = $response.Content | ConvertFrom-Json
        Write-Host "  Created: $($result.lesson.title) (ID: $($result.lesson.id))"
    } catch {
        Write-Host "  Error: $_"
    }
    Start-Sleep -Milliseconds 500
}

# Module 17 (Второй модуль Tripwire) - 3 пустых урока
Write-Host "`nCreating lessons in Module 17 (Tripwire Module 2)..."
$module2 = @(
    @{ module_id = 17; title = "Урок 2.1 - Модуль 2"; description = "" },
    @{ module_id = 17; title = "Урок 2.2 - Модуль 2"; description = "" },
    @{ module_id = 17; title = "Урок 2.3 - Модуль 2"; description = "" }
)

foreach ($lesson in $module2) {
    try {
        $body = $lesson | ConvertTo-Json
        $response = Invoke-WebRequest -Uri "https://api.onai.academy/api/tripwire/lessons" `
            -Method POST `
            -Headers $headers `
            -Body $body `
            -ContentType "application/json" `
            -ErrorAction Stop
        $result = $response.Content | ConvertFrom-Json
        Write-Host "  Created: $($result.lesson.title) (ID: $($result.lesson.id))"
    } catch {
        Write-Host "  Error: $_"
    }
    Start-Sleep -Milliseconds 500
}

# Module 18 (Третий модуль Tripwire) - 3 пустых урока
Write-Host "`nCreating lessons in Module 18 (Tripwire Module 3)..."
$module3 = @(
    @{ module_id = 18; title = "Урок 3.1 - Модуль 3"; description = "" },
    @{ module_id = 18; title = "Урок 3.2 - Модуль 3"; description = "" },
    @{ module_id = 18; title = "Урок 3.3 - Модуль 3"; description = "" }
)

foreach ($lesson in $module3) {
    try {
        $body = $lesson | ConvertTo-Json
        $response = Invoke-WebRequest -Uri "https://api.onai.academy/api/tripwire/lessons" `
            -Method POST `
            -Headers $headers `
            -Body $body `
            -ContentType "application/json" `
            -ErrorAction Stop
        $result = $response.Content | ConvertFrom-Json
        Write-Host "  Created: $($result.lesson.title) (ID: $($result.lesson.id))"
    } catch {
        Write-Host "  Error: $_"
    }
    Start-Sleep -Milliseconds 500
}

Write-Host "`nDone! Created 9 lessons total."

