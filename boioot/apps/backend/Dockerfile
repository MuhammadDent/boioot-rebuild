# =========================
# Base runtime
# =========================
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

# =========================
# Build stage
# =========================
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# نسخ ملف المشروع فقط (أفضل للكاش)
COPY boioot/apps/backend/src/Boioot.Api/Boioot.Api.csproj ./boioot/apps/backend/src/Boioot.Api/

# restore
RUN dotnet restore ./boioot/apps/backend/src/Boioot.Api/Boioot.Api.csproj

# نسخ باقي الملفات
COPY . .

# publish
RUN dotnet publish ./boioot/apps/backend/src/Boioot.Api/Boioot.Api.csproj \
    -c Release \
    -o /app/publish \
    /p:UseAppHost=false

# =========================
# Final stage
# =========================
FROM base AS final
WORKDIR /app

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080

ENTRYPOINT ["dotnet", "Boioot.Api.dll"]
