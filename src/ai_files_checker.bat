@echo off
color 0A
set "ROOT=F:\Software\My Apps\Medical Logbook\MedoraTrial4\SRC"

echo ================================================
echo   Medora AI Files Checker
echo ================================================
echo.
echo Root: %ROOT%
echo.

:: Types
if exist "%ROOT%\types\ai.types.ts" ( echo [OK] types\ai.types.ts ) else ( echo [MISSING] types\ai.types.ts )

:: Services/AI
if exist "%ROOT%\services\ai\aiConfig.ts" ( echo [OK] services\ai\aiConfig.ts ) else ( echo [MISSING] services\ai\aiConfig.ts )
if exist "%ROOT%\services\ai\aiPrompts.ts" ( echo [OK] services\ai\aiPrompts.ts ) else ( echo [MISSING] services\ai\aiPrompts.ts )
if exist "%ROOT%\services\ai\aiDeidentify.ts" ( echo [OK] services\ai\aiDeidentify.ts ) else ( echo [MISSING] services\ai\aiDeidentify.ts )
if exist "%ROOT%\services\ai\aiCache.ts" ( echo [OK] services\ai\aiCache.ts ) else ( echo [MISSING] services\ai\aiCache.ts )
if exist "%ROOT%\services\ai\aiRateLimiter.ts" ( echo [OK] services\ai\aiRateLimiter.ts ) else ( echo [MISSING] services\ai\aiRateLimiter.ts )
if exist "%ROOT%\services\ai\aiErrorHandler.ts" ( echo [OK] services\ai\aiErrorHandler.ts ) else ( echo [MISSING] services\ai\aiErrorHandler.ts )
if exist "%ROOT%\services\ai\aiService.ts" ( echo [OK] services\ai\aiService.ts ) else ( echo [MISSING] services\ai\aiService.ts )
if exist "%ROOT%\services\ai\providersData.ts" ( echo [OK] services\ai\providersData.ts ) else ( echo [MISSING] services\ai\providersData.ts )

:: Adapters
if exist "%ROOT%\services\ai\adapters\AIProviderAdapter.ts" ( echo [OK] services\ai\adapters\AIProviderAdapter.ts ) else ( echo [MISSING] services\ai\adapters\AIProviderAdapter.ts )
if exist "%ROOT%\services\ai\adapters\GeminiAdapter.ts" ( echo [OK] services\ai\adapters\GeminiAdapter.ts ) else ( echo [MISSING] services\ai\adapters\GeminiAdapter.ts )
if exist "%ROOT%\services\ai\adapters\HuggingFaceAdapter.ts" ( echo [OK] services\ai\adapters\HuggingFaceAdapter.ts ) else ( echo [MISSING] services\ai\adapters\HuggingFaceAdapter.ts )

:: Pages
if exist "%ROOT%\pages\CasePearlScreen.tsx" ( echo [OK] pages\CasePearlScreen.tsx ) else ( echo [MISSING] pages\CasePearlScreen.tsx )
if exist "%ROOT%\pages\AISettings.tsx" ( echo [OK] pages\AISettings.tsx ) else ( echo [MISSING] pages\AISettings.tsx )
if exist "%ROOT%\pages\GetAPIKeyScreen.tsx" ( echo [OK] pages\GetAPIKeyScreen.tsx ) else ( echo [MISSING] pages\GetAPIKeyScreen.tsx )
if exist "%ROOT%\pages\GroupPearlScreen.tsx" ( echo [OK] pages\GroupPearlScreen.tsx ) else ( echo [MISSING] pages\GroupPearlScreen.tsx )

:: Components
if exist "%ROOT%\components\AIInsightsTab.tsx" ( echo [OK] components\AIInsightsTab.tsx ) else ( echo [MISSING] components\AIInsightsTab.tsx )
if exist "%ROOT%\components\AILoadingState.tsx" ( echo [OK] components\AILoadingState.tsx ) else ( echo [MISSING] components\AILoadingState.tsx )
if exist "%ROOT%\components\AIPromptPreviewSheet.tsx" ( echo [OK] components\AIPromptPreviewSheet.tsx ) else ( echo [MISSING] components\AIPromptPreviewSheet.tsx )

:: Settings
if exist "%ROOT%\settings\sections\AISection.tsx" ( echo [OK] settings\sections\AISection.tsx ) else ( echo [MISSING] settings\sections\AISection.tsx )

:: App.tsx routes check
echo.
echo ================================================
echo App.tsx Routes Check:
echo ================================================
if exist "%ROOT%\App.tsx" (
    findstr /C:"CasePearlScreen" "%ROOT%\App.tsx" >nul && echo [OK] CasePearlScreen route || echo [MISSING] CasePearlScreen route
    findstr /C:"GetAPIKeyScreen" "%ROOT%\App.tsx" >nul && echo [OK] GetAPIKeyScreen route || echo [MISSING] GetAPIKeyScreen route
    findstr /C:"AISettings" "%ROOT%\App.tsx" >nul && echo [OK] AISettings route || echo [MISSING] AISettings route
) else (
    echo [ERROR] App.tsx not found
)

echo.
echo ================================================
echo   Check Complete - Press any key to exit
echo ================================================
pause >nul