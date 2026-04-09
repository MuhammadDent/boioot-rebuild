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

COPY boioot/apps/backend/src/Boioot.Api/Boioot.Api.csproj ./boioot/apps/backend/src/Boioot.Api/

RUN dotnet restore ./boioot/apps/backend/src/Boioot.Api/Boioot.Api.csproj

COPY . .

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

# PORT tells Program.cs which port Kestrel should bind to.
# Fly.io uses 8080 internally; ASPNETCORE_URLS is intentionally
# omitted to avoid conflicting with the explicit ConfigureKestrel call.
ENV PORT=8080

ENTRYPOINT ["dotnet", "Boioot.Api.dll"]
