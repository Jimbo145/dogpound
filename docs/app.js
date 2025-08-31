
// Placeholder for frontend logic
// You can use fetch() to get data from your backend or Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getFirestore, collection, getDocs, doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyBbc0DzjwvaYn3gvyPtLD1M-ibtGf5Ej0Q",
  authDomain: "dogpound-71cf4.firebaseapp.com",
  projectId: "dogpound-71cf4",
  storageBucket: "dogpound-71cf4.firebasestorage.app",
  messagingSenderId: "491130113673",
  appId: "1:491130113673:web:4f9b523e52c52523468058",
  measurementId: "G-D9KMSXDXGX"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


// Handle year selection and update content
document.addEventListener('DOMContentLoaded', function() {
  const yearSelector = document.getElementById('year-selector');
  const weekSelector = document.getElementById('week-selector');
  const appDiv = document.getElementById('app');


    async function setTopScorer(year, weekKey) {
        const docRef = doc(db, "data", year);
        const docSnap = await getDoc(docRef);

        const topScorerElem = document.getElementById('top-scorer-container');
        while (topScorerElem.firstChild) {
            topScorerElem.removeChild(topScorerElem.firstChild);
        }

        topScorerElem.appendChild(document.createElement('h2')).textContent = 'Top Scorer';

        for (const item of docSnap.data()[weekKey]['highest_points']) {
            const teamName = await getTeamName(item.team_id, year, weekKey);
            topScorerElem.appendChild(document.createElement('p')).textContent = teamName + ' ' + item.points;

        }
            
        
    }

    async function setTopBench(year, weekKey) {
        const docRef = doc(db, "data", year);
        const docSnap = await getDoc(docRef);

        const topScorerElem = document.getElementById('top-bench-container');
        while (topScorerElem.firstChild) {
            topScorerElem.removeChild(topScorerElem.firstChild);
        }

        topScorerElem.appendChild(document.createElement('h2')).textContent = 'Most Bench Points';

        for (const item of docSnap.data()[weekKey]['highest_bench_points']) {
            const teamName = await getTeamName(item.team_id, year, weekKey);
            topScorerElem.appendChild(document.createElement('p')).textContent = teamName + ' ' + item.points;

        }
    }

    async function setBenchScores(year, weekKey) {
        const docRef = doc(db, "data", year);
        const docSnap = await getDoc(docRef);
        const benchPointsElem = document.getElementById('bench-points-container');
        const benchTableElem = document.getElementById('bench-points-table');


        //clear existing elements
        while (benchTableElem.firstChild) {
            benchTableElem.removeChild(benchTableElem.firstChild);
        }

        var benchPointsList = docSnap.data()[weekKey]['bench_points'];

        var table_col = document.createElement('tr')
        table_col.appendChild(document.createElement('th')).textContent = "Position";
        table_col.appendChild(document.createElement('th')).textContent = "Bench Points";
        table_col.appendChild(document.createElement('th')).textContent = "Team Name";

        var i = 0;
        for (const item of benchPointsList) {
            i += 1;
            const teamName = await getTeamName(item.team_id, year, weekKey);
            table_col = document.createElement('tr')

            table_col.appendChild(document.createElement('td')).textContent = ""+i;
            table_col.appendChild(document.createElement('td')).textContent = item.points;
            table_col.appendChild(document.createElement('td')).textContent = teamName;
            
            benchTableElem.appendChild(table_col);
        }
    }

    async function setBalanceTable(year, weekKey) {
        const docRef = doc(db, "data", year);
        const docSnap = await getDoc(docRef);
        const balanceElem = document.getElementById('balance-container');
        const balanceTableElem = document.getElementById('balance-table');


        //clear existing elements
        while (balanceTableElem.firstChild) {
            balanceTableElem.removeChild(balanceTableElem.firstChild);
        }

        var balanceList = docSnap.data()[weekKey]['balance'];

        
        var table_col = document.createElement('tr')
        table_col.appendChild(document.createElement('th')).textContent = "Team";
        table_col.appendChild(document.createElement('th')).textContent = "Balance";
   

        for (let idx = 1; idx < balanceList.length; idx++) { // skip element 0
            const item = balanceList[idx];
            const teamName = await getTeamName(idx, year, weekKey);

            table_col = document.createElement('tr');
            table_col.appendChild(document.createElement('td')).textContent = teamName;
            table_col.appendChild(document.createElement('td')).textContent = "$" + item;

            balanceTableElem.appendChild(table_col);
            
        }
    }

    weekSelector.addEventListener('change', function() {
        const year = yearSelector.value;
        const weekKey = weekSelector.value;
        console.log("selected year:", year, "week:", weekKey);
        setTopScorer(year, weekKey);
        setTopBench(year, weekKey);
        setBenchScores(year, weekKey);
        setBalanceTable(year, weekKey);
    });

    async function listDocsInCollection(collectionName) {
        const colRef = collection(db, collectionName);
        const snapshot = await getDocs(colRef);
        return snapshot.docs.map(doc => doc.id);
    }

    // Example usage: list all documents in the "data" collection and log them
    listDocsInCollection("data").then(ids => {
        console.log("Document IDs in 'data' collection:", ids);
        ids.forEach(y => {
            const option = document.createElement('option');
            option.value = y;
            option.textContent = y;
            yearSelector.appendChild(option);
        });
        if (yearSelector.options.length > 0) {
            yearSelector.selectedIndex = 0;
            yearSelector.dispatchEvent(new Event('change'));
        }
    });

    async function setWeekOptions() {
        const year = this.value;
        const docRef = doc(db, "data", year);
        const docSnap = await getDoc(docRef);
        while (weekSelector.firstChild) {
            weekSelector.removeChild(weekSelector.firstChild);
        }
        if (docSnap.exists() ) {
            const data = docSnap.data();
            console.log("Fields in document:", Object.keys(data));
            Object.keys(data)
                .filter(key => key.startsWith('week.'))
                .map(key => ({
                    original: key,
                    num: parseInt(key.replace('week.', ''), 10)
                }))
                .sort((a, b) => b.num - a.num)
                .forEach(({ original, num }) => {
                    const option = document.createElement('option');
                    option.value = original;
                    option.textContent = `Week ${num + 1}`;
                    weekSelector.appendChild(option);
                });
            
        } else {
            //appDiv.innerHTML += `<pre>No document found for year ${year}</pre>`;
        }
        if (weekSelector.options.length > 0) {
            weekSelector.dispatchEvent(new Event('change'));
        }
    }

    async function getTeamName(teamId, year, weekKey) {
        // Assumes a "teams" collection with documents keyed by team_id and a "name" field
        const docRef = doc(db, "data", year);
        const docSnap = await getDoc(docRef);
        console.log("Document snapshot:", docSnap.data()[weekKey]['teams_names']);
        console.log(teamId)
        console.log(docSnap.data()[weekKey]['teams_names'][''+teamId]);

        var teamName = docSnap.data()[weekKey]['teams_names'][teamId];
        
        return  teamName;
    }


    yearSelector.addEventListener('change', setWeekOptions);



});

