#!/bin/bash
# bot reachability on every map
cd "$(dirname "$0")"
for m in "Arch Park" "Coastal Quickstop" "Devastation Station" "Factory Frenzy" "Fort Indestructible" "Furious Station" "Glass Office" "Happy Home" "Heights School" "Launch Land" "Lucky Mart" "Manic Mansion" "Modest Headquarters" "Party Palace" "Prison Panic" "Rainbow Ride" "Rakish Refinery" "Raving Raceway" "Safety Second" "Sky Tower" "Sunny Ranch" "Surf Central" "Trailer Park"; do
  timeout 590 node nav.mjs "$m" 150 2>&1 | grep -v "^$"
done
