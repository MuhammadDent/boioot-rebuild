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

# Copy solution + all project files (for cache-efficient restore)
# Paths are relative to the Docker build context: boioot/apps/backend/
COPY Boioot.sln ./
COPY src/Boioot.Api/Boioot.Api.csproj                     src/Boioot.Api/
COPY src/Boioot.Domain/Boioot.Domain.csproj               src/Boioot.Domain/
COPY src/Boioot.Application/Boioot.Application.csproj     src/Boioot.Application/
COPY src/Boioot.Infrastructure/Boioot.Infrastructure.csproj src/Boioot.Infrastructure/

RUN dotnet restore src/Boioot.Api/Boioot.Api.csproj

# Copy the rest of the source
COPY . .

RUN dotnet publish src/Boioot.Api/Boioot.Api.csproj \
    -c Release \
    -o /app/publish \
    /p:UseAppHost=false

# =========================
# Final stage
# =========================
FROM base AS final
WORKDIR /app

COPY --from=build /app/publish .

# Program.cs reads PORT to determine which port Kestrel binds to.
# Fly.io internal port is 8080 — no ASPNETCORE_URLS to avoid conflicts.
ENV PORT=8080

ENTRYPOINT ["dotnet", "Boioot.Api.dll"]
