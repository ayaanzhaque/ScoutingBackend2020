echo "Creating allData.json..."
echo "[" > functions/allData.json
cat files/ScoutingData*.txt >> functions/allData.json
sed '$ s/.$//' functions/allData.json > functions/allData.json.1
mv functions/allData.json.1 functions/allData.json
echo "]" >> functions/allData.json
echo "...created allData.json with" `wc -l functions/allData.json | awk '{print $1}'` "lines."

echo "Deploying to Firebase..."
firebase deploy
echo "... Firebase deploy complete"

