# Web Base PUBG ARENA

## Library use
- Three.js (for 3D Rendering)
- Cannon.js/Ammo.js (for physcis calculation)
- socketIO (for multi player)
- express (for hosting server)


## Game front page:
- Game description and instructions
- Player login /register page
- Instruction
- Waiting Room
- Ready Button
- Number of total players
- Number of players who are ready
- Waiting for the previous game end notice

## Game play page:
- Basic control instruction: 
    - up: go front
    - down: go back
    - left: go left
    - right: go right
    - space: shooting
    - f: cheat mode (freezing others)
    - d: drop the gun
- 2.5D Map with fix angle but background
- changing while player moving
- player remain health bar
- player remain Ammo
- weapons on ground (randomly placed)
- bullets be shot 
- players' character
- Sounds effects
    - shooting sounds
    - BGM
- Visual effects
    -  got hit effect
        - victim side effect
        - shooter effect
    - got frozon effect
        - victim side effect
        - cheater effect
- Obstacle on map that block player movements and bullet 

## Game over page:
- Final Ranking of player
- Kills count of player
- Times of death of player
- play again Button
- Logout button

## Cheating:
- f key: freeze all other players for 2 seconds
other players got frozen effect and can't move for 2 seconds.