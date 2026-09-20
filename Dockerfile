FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy csproj files for layer caching
COPY ["backend/HotelSaaS.Domain/HotelSaaS.Domain.csproj", "backend/HotelSaaS.Domain/"]
COPY ["backend/HotelSaaS.Application/HotelSaaS.Application.csproj", "backend/HotelSaaS.Application/"]
COPY ["backend/HotelSaaS.Infrastructure/HotelSaaS.Infrastructure.csproj", "backend/HotelSaaS.Infrastructure/"]
COPY ["backend/HotelSaaS.Api/HotelSaaS.Api.csproj", "backend/HotelSaaS.Api/"]

RUN dotnet restore "backend/HotelSaaS.Api/HotelSaaS.Api.csproj"

# Copy source code and build
COPY . .
WORKDIR "/src/backend/HotelSaaS.Api"
RUN dotnet publish "HotelSaaS.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime image
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "HotelSaaS.Api.dll"]
