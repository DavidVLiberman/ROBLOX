#!/bin/bash
# a live round on every map, cycling through the disasters
cd "$(dirname "$0")"
maps=("Arch Park" "Coastal Quickstop" "Devastation Station" "Factory Frenzy" "Fort Indestructible" "Furious Station" "Glass Office" "Happy Home" "Heights School" "Launch Land" "Lucky Mart" "Manic Mansion" "Modest Headquarters" "Party Palace" "Prison Panic" "Rainbow Ride" "Rakish Refinery" "Raving Raceway" "Safety Second" "Sky Tower" "Sunny Ranch" "Surf Central" "Trailer Park")
dis=("Tornado" "Meteor Shower" "Volcanic Eruption" "Tsunami" "Acid Rain" "Sandstorm" "Blizzard" "Virus" "Thunder Storm" "Fire" "Earthquake" "Flash Flood" "Avalanche")
for i in "${!maps[@]}"; do
  d=${dis[$((i % ${#dis[@]}))]}
  timeout 400 node round.mjs "${maps[$i]}" "$d" 300 2>&1 | tail -2 | tr '\n' ' '; echo
done
