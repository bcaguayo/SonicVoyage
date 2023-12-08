## Coding 

1. Game System: Level / Tier Based

    a. Progression on Markers, Quest system:
    - Listen to Song
    - Read Article
    - Watch Video
    
    b. Task -> Decimal Progress
2. Generate Parameters for User Recent Songs / User Top Songs
    getAverageParams(top_50(user) // recent_10(user)): Musicality, Danceability, Loudness, etc
3. Get Average Parameters for Genres: 
    getAverageParams(top_50(genre)): Musicality, Danceability, Loudness, etc
4. Compare(User_Params, Genre_Params)
5. Get Stats for Genres: Monthly listeners, Popular in Country