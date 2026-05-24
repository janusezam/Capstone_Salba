# 🎯 SALBA SYSTEM ARCHITECTURE & INTEGRATION DIAGRAMS
## Complete Visual Reference for Three-Application Emergency Response Platform

---

## 1. COMPLETE SYSTEM ECOSYSTEM DIAGRAM

```mermaid
graph TB
    subgraph Citizens["TIER 1: CITIZEN REPORTING"]
        DS["DisasterSOS Mobile App"]
        DS_comp["Components:"]
        DS_comp1["• Alert Screen"]
        DS_comp2["• Map View"]
        DS_comp3["• History"]
        DS_comp4["• Auth (Email/Google)"]
    end
    
    subgraph Admin["TIER 2: ADMINISTRATION"]
        AW["AdminWebApp Dashboard"]
        AW_comp["Components:"]
        AW_comp1["• Alert Feed"]
        AW_comp2["• Team Manager"]
        AW_comp3["• Real-time Map"]
        AW_comp4["• Reports & PDF"]
    end
    
    subgraph Rescue["TIER 3: RESCUE OPERATIONS"]
        RA["RescuerApp Mobile"]
        RA_comp["Components:"]
        RA_comp1["• Dashboard"]
        RA_comp2["• Mission Map"]
        RA_comp3["• Notifications"]
        RA_comp4["• Profile"]
    end
    
    subgraph Backend["BACKEND SERVICES"]
        Server["Express.js Server"]
        Server_features["Features:"]
        Server_f1["✓ REST APIs"]
        Server_f2["✓ Socket.IO"]
        Server_f3["✓ JWT Auth"]
        Server_f4["✓ ML Integration"]
    end
    
    subgraph Database["DATA PERSISTENCE"]
        DB["MongoDB"]
        DB_collections["Collections:"]
        DB_c1["• users"]
        DB_c2["• reports"]
        DB_c3["• teams"]
        DB_c4["• notifications"]
    end
    
    subgraph External["EXTERNAL SERVICES"]
        OAuth["Google OAuth"]
        ML["ML/AI Service"]
        Notifications["Push Notifications"]
    end
    
    DS -->|POST /alerts| Server
    AW -->|REST + WebSocket| Server
    RA -->|REST + WebSocket| Server
    Server -->|Read/Write| DB
    Server -->|Verify Token| OAuth
    Server -->|Async Processing| ML
    RA -->|Register Token| Notifications
    Server -->|Emit Events| Notifications
    
    style Citizens fill:#e1f5fe
    style Admin fill:#f3e5f5
    style Rescue fill:#e8f5e9
    style Backend fill:#fff3e0
    style Database fill:#fce4ec
    style External fill:#f1f8e9
```

---

## 2. DATA FLOW: FROM ALERT SUBMISSION TO RESOLUTION

```mermaid
sequenceDiagram
    participant Citizen as Citizen (DisasterSOS)
    participant API as Backend Server
    participant Admin as Admin (AdminWebApp)
    participant DB as MongoDB
    participant ML as ML Service
    participant Rescuer as Rescuer (RescuerApp)
    
    Citizen->>API: POST /alerts (disaster type, location, coords)
    activate API
    
    API->>DB: Create Report (status: 'new')
    activate DB
    DB-->>API: Report created
    deactivate DB
    
    API->>ML: Async verification (no wait)
    activate ML
    
    API->>Admin: emit 'new_alert' (Socket.IO)
    Admin->>Admin: Display in alert feed
    
    Admin->>API: PATCH /alerts/:id (acknowledge)
    API->>DB: Update status to 'acknowledged'
    
    Admin->>Admin: Select Team (Alpha, Bravo, etc)
    Admin->>API: PATCH /teams/:id/assignment
    API->>DB: Update team.currentMission
    API->>Rescuer: emit 'new_mission' (Socket.IO)
    
    Rescuer->>Rescuer: Accept mission, enable GPS
    Rescuer->>API: emit 'rescuer_location' (every 5s)
    
    loop Every 5-10 seconds
        API->>DB: Update user location
        API->>Admin: emit 'rescuer_location_update'
        Admin->>Admin: Update rescuer position on map
    end
    
    Rescuer->>Rescuer: Arrive at incident location
    Admin->>API: PATCH /alerts/:id (resolved)
    API->>DB: Update status to 'resolved'
    API->>Rescuer: emit 'mission_completed' (Socket.IO)
    Rescuer->>Rescuer: Clear mission, return to dashboard
    
    ML-->>API: Return predictions
    API->>DB: Update report.mlPredictions
    
    Admin->>API: POST /reports/generate-pdf
    API-->>Admin: Download PDF report
    
    deactivate ML
    deactivate API
```

---

## 3. APPLICATION ARCHITECTURE: DISASTERSOS

```mermaid
graph TD
    A["📱 DisasterSOS App"]
    
    subgraph Screens["Screens"]
        B["Authentication"]
        B1["Login Screen"]
        B2["Register Screen"]
        B3["Google OAuth"]
        
        C["Main Features"]
        C1["Home/Alert Screen"]
        C2["Map Screen"]
        C3["History Screen"]
        C4["Profile Screen"]
    end
    
    subgraph Services["Service Layer"]
        D["API Service"]
        D1["alertService.js"]
        D2["authService.js"]
        
        E["Navigation"]
        E1["AppNavigator"]
        E2["AuthStack"]
        E3["MainTabs"]
    end
    
    subgraph Config["Configuration"]
        F["api.js"]
        F1["BASE_URL: 192.168.1.57:5000"]
    end
    
    subgraph Storage["Local Storage"]
        G["AsyncStorage"]
        G1["JWT Token"]
        G2["User Info"]
        G3["Report History"]
    end
    
    subgraph ExternalLibs["External Libraries"]
        H["Expo"]
        H1["Location"]
        H2["Notifications"]
        H3["Print"]
        
        I["React Navigation"]
        J["Maps"]
    end
    
    A --> Screens
    A --> Services
    A --> Config
    A --> Storage
    A --> ExternalLibs
    
    Screens --> Services
    Services --> D1
    Services --> D2
    D1 --> D
    D2 --> D
    D --> F
    
    C1 -->|Send Alert| D1
    C2 -->|Select Location| C1
    H1 -->|Get GPS| C1
    
    style A fill:#e1f5fe
    style Screens fill:#b3e5fc
    style Services fill:#81d4fa
    style Config fill:#4fc3f7
    style Storage fill:#29b6f6
```

---

## 4. APPLICATION ARCHITECTURE: ADMINWEBAPP

```mermaid
graph LR
    subgraph Frontend["Frontend (React)"]
        A["App.js"]
        
        Pages["Pages"]
        P1["AdminDashboard"]
        P2["AlertsPage"]
        P3["RescuerPanel"]
        P4["TeamsPage"]
        P5["ReportsPage"]
        
        Components["Components"]
        C1["AlertCard"]
        C2["RescuerDashboard"]
        C3["MapComponent"]
        C4["TeamAssignment"]
        C5["ReportGenerator"]
        
        State["State Management"]
        S1["AuthContext"]
        S2["AppContext"]
        S3["WebSocket Hook"]
    end
    
    subgraph Backend["Backend (Node.js/Express)"]
        Server["Express Server"]
        
        Routes["Routes"]
        R1["authRoutes"]
        R2["alertRoutes"]
        R3["rescueRoutes"]
        R4["teamRoutes"]
        R5["reportRoutes"]
        R6["mlRoutes"]
        
        Models["Models"]
        M1["User"]
        M2["Report"]
        M3["Team"]
        M4["Notification"]
        M5["AIFeedback"]
        
        Utils["Utilities"]
        U1["enhancedMLModel"]
        U2["mlServiceClient"]
        U3["malaybalayLocations"]
    end
    
    subgraph Database["Database (MongoDB)"]
        DB["capstoneDB"]
    end
    
    Frontend -->|HTTP + WebSocket| Server
    Server --> Routes
    Routes --> Models
    Models --> DB
    Server --> Utils
    
    style Frontend fill:#f3e5f5
    style Backend fill:#fff3e0
    style Database fill:#fce4ec
```

---

## 5. APPLICATION ARCHITECTURE: RESCUERAPP

```mermaid
graph TD
    A["📱 RescuerApp (React Native)"]
    
    subgraph Screens["Screens"]
        B["Auth Screens"]
        B1["LoginScreen"]
        B2["RegisterScreen"]
        
        C["Main Screens"]
        C1["DashboardScreen"]
        C2["MapScreen"]
        C3["NotificationsScreen"]
        C4["ProfileScreen"]
    end
    
    subgraph Context["State Management"]
        D["Contexts"]
        D1["AuthContext"]
        D2["NotificationContext"]
        D3["SocketContext"]
    end
    
    subgraph Services["Services"]
        E["API Client"]
        E1["Fetch wrapper"]
        E2["Timeout handling"]
        
        F["Location Service"]
        F1["GPS tracking"]
        F2["Continuous updates"]
        
        G["Socket.IO Client"]
        G1["join_rescuer_room"]
        G2["rescuer_location events"]
        G3["mission notifications"]
    end
    
    subgraph Config["Configuration"]
        H["api.js"]
        H1["BASE_URL: 192.168.1.57"]
        H2["Endpoints"]
        H3["Auth headers"]
    end
    
    subgraph ExternalLibs["External Libraries"]
        I["React Native"]
        J["Expo"]
        J1["Location"]
        J2["Notifications"]
        J3["Icons"]
        
        K["Socket.IO Client"]
        L["React Navigation"]
        M["Maps"]
    end
    
    A --> Screens
    A --> Context
    A --> Services
    A --> Config
    A --> ExternalLibs
    
    Screens --> Context
    Context --> Services
    C1 -->|GET /rescue/my-mission| E
    G1 -->|Team room| G
    F2 -->|emit rescuer_location| G2
    
    style A fill:#e8f5e9
    style Screens fill:#c8e6c9
    style Services fill:#a5d6a7
```

---

## 6. API COMMUNICATION MATRIX

```mermaid
graph TB
    subgraph DS["DisasterSOS"]
        DS1["POST /alerts"]
        DS2["GET /locations/barangays"]
        DS3["POST /auth/register"]
        DS4["POST /auth/login"]
        DS5["POST /auth/google"]
    end
    
    subgraph AW["AdminWebApp"]
        AW1["GET /alerts"]
        AW2["PATCH /alerts/:id"]
        AW3["GET /teams"]
        AW4["PATCH /teams/:id"]
        AW5["GET /reports"]
        AW6["POST /reports/generate-pdf"]
        AW7["POST /ml/verify-report"]
    end
    
    subgraph RA["RescuerApp"]
        RA1["GET /rescue/my-mission"]
        RA2["GET /rescue/my-team"]
        RA3["GET /rescue/notifications"]
        RA4["PATCH /rescue/notifications/:id"]
        RA5["POST /rescue/push-token"]
        RA6["POST /rescue/status"]
    end
    
    subgraph Server["Express.js Backend"]
        Auth["Auth"]
        Alerts["Alerts"]
        Rescue["Rescue"]
        Teams["Teams"]
        Reports["Reports"]
        ML["ML/AI"]
    end
    
    DS1 --> Alerts
    DS3 --> Auth
    DS4 --> Auth
    DS5 --> Auth
    DS2 --> Alerts
    
    AW1 --> Alerts
    AW2 --> Alerts
    AW3 --> Teams
    AW4 --> Teams
    AW5 --> Reports
    AW6 --> Reports
    AW7 --> ML
    
    RA1 --> Rescue
    RA2 --> Rescue
    RA3 --> Rescue
    RA4 --> Rescue
    RA5 --> Rescue
    RA6 --> Rescue
    
    style DS fill:#e1f5fe
    style AW fill:#f3e5f5
    style RA fill:#e8f5e9
    style Server fill:#fff3e0
```

---

## 7. REAL-TIME COMMUNICATION: WEBSOCKET FLOW

```mermaid
graph TB
    subgraph Apps["Connected Clients"]
        Admin["AdminWebApp"]
        Rescuer1["Rescuer 1"]
        Rescuer2["Rescuer 2"]
        Rescuer3["Rescuer 3"]
    end
    
    subgraph SocketIO["Socket.IO Server"]
        Server["Server Instance"]
        Rooms["Request: Rooms"]
        AdminRoom["'admins' Room"]
        TeamRoom["'team_Alpha' Room"]
        PersonalRoom1["'rescuer_123' Room"]
        PersonalRoom2["'rescuer_456' Room"]
    end
    
    subgraph Events["Event Broadcasting"]
        E1["new_alert"]
        E2["rescuer_location_update"]
        E3["new_mission"]
        E4["mission_completed"]
        E5["notification"]
    end
    
    Admin -->|join_admin| AdminRoom
    Rescuer1 -->|join_rescuer_room| TeamRoom
    Rescuer2 -->|join_rescuer_room| TeamRoom
    Rescuer3 -->|join_rescuer_room| TeamRoom
    
    Rescuer1 -->|emit rescuer_location| Server
    Rescuer2 -->|emit rescuer_location| Server
    Rescuer3 -->|emit rescuer_location| Server
    
    Server -->|broadcast to admins| AdminRoom
    AdminRoom -->|receive| E2
    AdminRoom -->|receive| E3
    
    Server -->|broadcast to team| TeamRoom
    TeamRoom -->|receive| E3
    TeamRoom -->|receive| E4
    
    Server -->|emit to individual| PersonalRoom1
    Server -->|emit to individual| PersonalRoom2
    
    PersonalRoom1 -->|receive| E5
    PersonalRoom2 -->|receive| E5
    
    style Server fill:#fff3e0
    style AdminRoom fill:#f3e5f5
    style TeamRoom fill:#e8f5e9
    style PersonalRoom1 fill:#e0f2f1
    style PersonalRoom2 fill:#e0f2f1
```

---

## 8. ALERT LIFECYCLE STATE MACHINE

```mermaid
stateDiagram-v2
    [*] --> NEW: Citizen submits alert\n(POST /alerts)
    
    NEW --> ACKNOWLEDGED: Admin clicks\nAcknowledge button\n(PATCH /alerts/:id)
    NEW --> DECLINED: Admin rejects\nalert as false\n(PATCH /alerts/:id)
    
    ACKNOWLEDGED --> IN_PROGRESS: Admin assigns\nrescue team\n(PATCH /teams/:id),\n(Broadcast to team)
    ACKNOWLEDGED --> NEW: Admin unacknowledges\n(rare)
    
    IN_PROGRESS --> IN_PROGRESS: Real-time rescuer\nlocation updates\n(Socket: rescuer_location)
    IN_PROGRESS --> RESOLVED: Admin marks\nincident resolved\n(PATCH /alerts/:id),\n(Broadcast mission_completed)
    IN_PROGRESS --> IN_PROGRESS: Rescuers arrive\nat scene
    
    RESOLVED --> [*]
    DECLINED --> [*]
    
    note right of NEW
        Duration: ~1-2 seconds
        Team: Not assigned
        Rescuers: Not notified
    end note
    
    note right of ACKNOWLEDGED
        Duration: ~5-10 seconds
        Team: Selected
        Rescuers: Not yet notified
    end note
    
    note right of IN_PROGRESS
        Duration: ~10-30 minutes
        Team: Deployed
        Rescuers: Sending location
        Map: Live tracking active
    end note
    
    note right of RESOLVED
        Report: Archived
        Team: Back to available
        Report: Can be generated as PDF
    end note
```

---

## 9. USER ROLE-BASED ACCESS CONTROL

```mermaid
graph LR
    subgraph Users["User Roles"]
        Citizen["👤 Citizen"]
        Admin["👨‍💼 Admin"]
        Rescuer["🚒 Rescuer"]
    end
    
    subgraph Features["Features/Permissions"]
        SF1["Submit Alert"]
        SF2["View Own Alerts"]
        SF3["View All Alerts"]
        SF4["Acknowledge Alert"]
        SF5["Assign Team"]
        SF6["View Current Mission"]
        SF7["Update Location"]
        SF8["Generate Report"]
        SF9["Manage Users"]
        SF10["View ML Predictions"]
    end
    
    subgraph Apps["App Access"]
        APP1["DisasterSOS"]
        APP2["AdminWebApp"]
        APP3["RescuerApp"]
    end
    
    Citizen -->|✓| SF1
    Citizen -->|✓| SF2
    Citizen -->|✓| SF7
    Citizen -->|✗| SF3
    
    Admin -->|✓| SF1
    Admin -->|✓| SF3
    Admin -->|✓| SF4
    Admin -->|✓| SF5
    Admin -->|✓| SF8
    Admin -->|✓| SF9
    Admin -->|✓| SF10
    
    Rescuer -->|✗| SF1
    Rescuer -->|✓| SF6
    Rescuer -->|✓| SF7
    
    Citizen --> APP1
    Admin --> APP2
    Admin -.->|optional| APP1
    Rescuer --> APP3
    
    style Citizen fill:#e1f5fe
    style Admin fill:#f3e5f5
    style Rescuer fill:#e8f5e9
```

---

## 10. DATABASE RELATIONSHIP DIAGRAM

```mermaid
erDiagram
    USERS ||--o{ REPORTS : submits
    USERS ||--o{ TEAMS : "belongs to"
    USERS ||--o{ NOTIFICATIONS : receives
    USERS ||--o{ AIFEEDBACK : "reviews"
    
    REPORTS ||--o| TEAMS : "assigned to"
    REPORTS ||--o| USERS : "resolved by"
    REPORTS ||--o| AIFEEDBACK : "has predictions"
    
    TEAMS ||--o{ USERS : "has members"
    TEAMS ||--o| USERS : "led by"
    TEAMS ||--o| REPORTS : "current mission"
    
    NOTIFICATIONS ||--o| REPORTS : "about"
    NOTIFICATIONS ||--o| TEAMS : "about"
    
    USERS {
        objectid _id
        string name
        string email
        string username
        string role
        object location
        timestamp createdAt
    }
    
    REPORTS {
        objectid _id
        objectid userId
        number latitude
        number longitude
        string disasterType
        string status
        objectid assignedTeam
        object mlPredictions
        timestamp createdAt
    }
    
    TEAMS {
        objectid _id
        string name
        object[] members
        objectid currentMission
        string status
        timestamp createdAt
    }
    
    NOTIFICATIONS {
        objectid _id
        objectid userId
        string type
        object data
        boolean isRead
        timestamp createdAt
    }
    
    AIFEEDBACK {
        objectid _id
        objectid reportId
        object predictions
        object adminCorrection
        timestamp createdAt
    }
```

---

## 11. DEPLOYMENT ARCHITECTURE

```mermaid
graph TB
    subgraph MobileDevices["Mobile Devices"]
        IOS["iOS Devices"]
        Android["Android Devices"]
    end
    
    subgraph WebBrowsers["Web Browsers"]
        Admin_Browser["Admin Dashboard"]
    end
    
    subgraph Applications["Applications"]
        DS_APK["DisasterSOS APK"]
        RA_APK["RescuerApp APK"]
        AW_Web["AdminWebApp Web"]
    end
    
    subgraph BackendInfra["Backend Infrastructure"]
        Server["Express.js Server<br/>Port: 5000"]
        Cache["Cache Layer<br/>Session Storage"]
    end
    
    subgraph Database["Database"]
        DirectDB["MongoDB Instance<br/>Port: 27017<br/>Database: capstoneDB"]
    end
    
    subgraph ExternalServices["External Services"]
        GoogleOAuth["Google OAuth2<br/>Cloud.google.com"]
        MLService["ML/AI Service<br/>Python Flask"]
        FCM["Firebase Cloud<br/>Messaging"]
    end
    
    subgraph CDN["Content Delivery"]
        StaticFiles["Static Assets<br/>CSS, JS, Images"]
    end
    
    MobileDevices --> Applications
    WebBrowsers --> Applications
    
    DS_APK -->|HTTP/REST| Server
    DS_APK -->|WebSocket| Server
    RA_APK -->|HTTP/REST| Server
    RA_APK -->|WebSocket| Server
    AW_Web -->|HTTP/REST| Server
    AW_Web -->|WebSocket| Server
    
    Server --> Cache
    Server --> DirectDB
    Server --> GoogleOAuth
    Server --> MLService
    Server --> FCM
    Server --> StaticFiles
    
    style MobileDevices fill:#e1f5fe
    style WebBrowsers fill:#f3e5f5
    style BackendInfra fill:#fff3e0
    style Database fill:#fce4ec
    style ExternalServices fill:#f1f8e9
```

---

## 12. DATA FLOW: ALERT TO RESOLUTION

```mermaid
graph TB
    A["🚨 ALERT SUBMISSION"] -->|1. Citizen clicks alert| B["DisasterSOS captures GPS"]
    B -->|2. POST /alerts| C["Backend receives alert"]
    C -->|3. Create Report| D["Save to MongoDB"]
    D -->|4. Run ML async| E["ML Verification"]
    C -->|5. Socket.IO| F["AdminWebApp"]
    F -->|6. Display in feed| G["Admin reviews alert"]
    
    G -->|7. Click Acknowledge| H["PATCH /alerts/:id"]
    H -->|8. Update status| D
    H -->|9. Choose Team| I["Select Alpha/Bravo/etc"]
    I -->|10. Assign Team| J["PATCH /teams/:id"]
    J -->|11. Update Team| D
    J -->|12. Socket.IO 'new_mission'| K["RescuerApp notified"]
    
    K -->|13. Rescuer accepts| L["Enable GPS tracking"]
    L -->|14. emit rescuer_location| M["Backend receives event"]
    M -->|15. Update location| D
    M -->|16. Socket.IO to admin| F
    F -->|17. Update map| N["Show rescuer positions"]
    N -->|18. Continuous tracking| M
    
    L -->|19. Rescuer arrives| O["Scene response"]
    G -->|20. Mark Resolved| P["PATCH /alerts/:id"]
    P -->|21. Update status| D
    P -->|22. Update team| J
    P -->|23. mission_completed| K
    K -->|24. Clear mission| Q["Dashboard idle"]
    
    G -->|25. Generate Report| R["POST /reports/generate-pdf"]
    R -->|26. Compile data| S["Create PDF"]
    S -->|27. Download| G
    
    style A fill:#ffcdd2
    style B fill:#fff9c4
    style C fill:#c8e6c9
    style D fill:#b2dfdb
    style E fill:#e1bee7
    style F fill:#f3e5f5
    style G fill:#f0f4c3
    style H fill:#c5e1a5
    style I fill:#fff59d
    style J fill:#ffccbc
    style K fill:#ffab91
    style L fill:#81c784
    style M fill:#64b5f6
    style N fill:#4fc3f7
    style O fill:#a1887f
    style P fill:#ffb3ba
    style Q fill:#d5c6e0
    style R fill:#f8bbd0
    style S fill:#d1a4d4
```

---

## 13. AUTHENTICATION FLOW

```mermaid
sequenceDiagram
    participant User as User
    participant App as Mobile/Web App
    participant Backend as Express Backend
    participant DB as MongoDB
    participant OAuth as Google OAuth
    
    alt Email/Password Auth
        User->>App: Enter email & password
        App->>App: Validate input
        App->>Backend: POST /auth/login {email, password}
        Backend->>DB: Query user by email
        DB-->>Backend: Return hashed password
        Backend->>Backend: bcrypt.compare()
        alt Password matches
            Backend->>Backend: Generate JWT
            Backend-->>App: Return {token, user}
            App->>App: Save to AsyncStorage
            App->>App: Navigate to main app
        else Password mismatch
            Backend-->>App: 401 Unauthorized
            App->>App: Show error message
        end
    else Google OAuth (Citizens only)
        User->>App: Click "Sign in with Google"
        App->>OAuth: Launch Google consent screen
        User->>OAuth: Authorize app
        OAuth-->>App: Return ID token
        App->>Backend: POST /auth/google {idToken}
        Backend->>OAuth: Verify token with Google
        OAuth-->>Backend: Token verified
        alt User exists
            Backend->>DB: Update user.picture
            Backend->>Backend: Generate JWT
            Backend-->>App: Return {token, user}
        else User doesn't exist
            Backend->>DB: Create new user
            Backend->>Backend: Generate JWT
            Backend-->>App: Return {token, user}
        end
        App->>App: Save to AsyncStorage
        App->>App: Navigate to main app
    end
    
    alt Rescuer Registration
        User->>App: Enter name, username, password
        App->>Backend: POST /auth/register {name, username, password, role: 'rescuer'}
        Backend->>DB: Check username uniqueness
        alt Username exists
            Backend-->>App: 400 Bad Request
        else Username available
            Backend->>Backend: bcrypt.hash(password)
            Backend->>DB: Create rescuer account
            Backend->>Backend: Generate JWT
            Backend-->>App: Return {token, user}
        end
    end
```

---

## 14. LOCATION TRACKING & MAPPING

```mermaid
graph TB
    A["🛰️ GPS Started"] -->|Expo Location| B["Get Current Position"]
    B -->|Every 5-10s| C["Emit Socket Event"]
    C -->|rescuerId, lat, lng| D["Backend Receives"]
    
    D -->|Haversine Formula| E["Find Nearest Location"]
    E -->|Distance calculation| F["Map to Barangay/Purok"]
    F -->|Update User model| G["Store location string"]
    
    G -->|lat, lng coords| H["Store in DB"]
    D -->|io.to admins| I["AdminWebApp Receives"]
    
    I -->|Update map marker| J["Show rescuer position"]
    J -->|Calculate distance| K["Get ETA to incident"]
    K -->|Display on UI| L["Admin sees"]
    
    E -->|Location name| M["Rescuer notification"]
    M -->|'Currently at Purok 1'| N["Rescuer sees location"]
    
    style A fill:#e1f5fe
    style B fill:#b3e5fc
    style C fill:#81d4fa
    style D fill:#4fc3f7
    style E fill:#29b6f6
    style F fill:#039be5
    style G fill:#0277bd
    style H fill:#01579b
    style I fill:#f3e5f5
    style J fill:#e1bee7
    style K fill:#ce93d8
    style L fill:#ba68c8
```

---

## 15. ERROR HANDLING & RESILIENCE

```mermaid
graph TD
    A["Request Sent"] -->|Success 200| B["Process Response"]
    A -->|Timeout 5s| C["Retry Logic"]
    A -->|Network Error| D["Cache Response"]
    A -->|Server 500| E["Show Error Message"]
    A -->|Unauthorized 401| F["Refresh Token"]
    A -->|Invalid JWT 403| G["Redirect to Login"]
    
    B --> H["Update UI"]
    C -->|Attempt 1,2,3| I{Success?}
    I -->|Yes| B
    I -->|No| J["Show Offline Mode"]
    D -->|Load from AsyncStorage| K["Show Cached Data"]
    F -->|Get new token| L{Valid?}
    L -->|Yes| M["Retry Original Request"]
    L -->|No| G
    E --> N["Log Error & Alert User"]
    J --> O["Queue for later sync"]
    G --> P["Clear stored token"]
    
    style A fill:#fff9c4
    style B fill:#c8e6c9
    style C fill:#ffccbc
    style D fill:#b3e5fc
    style E fill:#ffcdd2
    style F fill:#f8bbd0
    style H fill:#b2dfdb
    style I fill:#ffe0b2
    style J fill:#ffb74d
    style K fill:#81c784
    style M fill:#64b5f6
    style N fill:#ef9a9a
    style O fill:#f48fb1
    style P fill:#ce93d8
```

---

## Summary of Key Integration Points

| **Component** | **Communicates With** | **Protocol** | **Purpose** |
|---|---|---|---|
| DisasterSOS | Backend | REST (HTTP) | Alert submission, auth, location lookup |
| AdminWebApp | Backend | REST + WebSocket | Alert management, team assignment, real-time updates |
| RescuerApp | Backend | REST + WebSocket | Mission retrieval, location publishing, notifications |
| Backend | MongoDB | Driver | Data persistence |
| Backend | Google OAuth | HTTPS | Token verification |
| Backend | ML Service | HTTP | Async prediction & verification |
| Backend | Firebase/Expo | HTTPS | Push notifications |
| All Apps | Backend | WebSocket (Socket.IO) | Real-time events (alerts, missions, locations) |

---

**Architecture Version:** 1.0  
**Last Updated:** April 5, 2026  
**Visualization Tool:** Mermaid  
**Status:** Complete
