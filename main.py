

from config_secrets import ESPN_SWID, ESPN_S2
from espn_api.football import League

# Firebase Admin SDK
import firebase_admin
from firebase_admin import credentials, firestore

season_year = 2025

class TeamResult:
    def __init__(self, team_id, points):
        self.team_id = team_id
        self.points = points
    def to_dict(self):
        return {
            "team_id": self.team_id,
            "points": self.points}
    def __repr__(self):
        return f"TeamResult(team_id={self.team_id}, points={self.points})"

class Year:
    def __init__(self,season_year, db):
        self.weeks = []
        doc_ref = db.collection("data").document(str(season_year))    
        doc = doc_ref.get()
        if doc.exists:
            self.weeks = doc.to_dict()

    def get_last_week(self, week_number):
        if(week_number >= 1):
            try:
                last_week_key = "week." + str(week_number - 1)
                return self.weeks[last_week_key]
            except KeyError:
                print(f"Last week not found for week number: {last_week_key}")
                return None


class Week:
    def __init__(self, last_week):
        self.highest_points = []
        self.highest_bench_points = []
        self.bench_over_starters = []
        self.teams_names = {}
        self.bench_points = []
        self.total_points = []
        if last_week == None:
            self.balance = {}
        else:
            self.balance = last_week["balance"]


    def set_highest_points(self, team_results):
        self.highest_points = team_results
        num_items = len(team_results)
        if num_items == 1:
            team_id = team_results[0].team_id
            current_balance = self.balance.get(team_id, 0)
            self.balance.update({team_id: current_balance + (30)})
        elif num_items > 1:
            for i in range(num_items):
                team_id = team_results[i].team_id
                current_balance = self.balance.get(team_id, 0)
                self.balance.update({team_id: current_balance + (30 / 2)})


    def set_highest_bench_points(self, team_results):
        self.highest_bench_points = team_results
    
    def set_bench_points(self, team_results):
        self.bench_points = team_results

    def set_total_points(self, team_results):
        self.total_points = team_results

    def append_bench_over_starters(self, team_id):
        self.bench_over_starters.append(team_id)
    
    def append_team_name(self, team_id, team_name):
        self.teams_names[team_id] = team_name


    def to_dict(self):
        # Ensure all keys in balance and teams_names are strings
        balance_str_keys = {str(k): v for k, v in self.balance.items()}
        teams_names_str_keys = {str(k): v for k, v in self.teams_names.items()}
        return {
            "highest_points": [tr.to_dict() for tr in self.highest_points],
            "highest_bench_points": [tr.to_dict() for tr in self.highest_bench_points],
            "bench_over_starters": self.bench_over_starters,
            "bench_points": [tr.to_dict() for tr in self.bench_points],
            "total_points": [tr.to_dict() for tr in self.total_points],
            "balance": balance_str_keys,
            "teams_names": teams_names_str_keys
        }


# Initialize Firebase app
def initialize_firebase():
    try:
        cred = credentials.Certificate('dogpound-71cf4-firebase-adminsdk-fbsvc-24eb8335f9.json')  # Replace with your service account key JSON file if needed
        firebase_admin.initialize_app(cred)
        print('Firebase initialized successfully.')
    except Exception as e:
        print(f'Error initializing Firebase: {e}')

# Get Firestore client
def get_firestore_client():
    if not firebase_admin._apps:
        initialize_firebase()
    return firestore.client()

def resolve_highest_points(week_number, this_week: Week, league: League):
    # Logic to resolve highest points for the week
    highest_point_total = 0
    highest_point_team = []
    for team in league.teams:
        points = team.scores[week_number]
        if points > highest_point_total:
            highest_point_total = points

    for team in league.teams:
        if team.scores[week_number] == highest_point_total:
            highest_point_team.append(TeamResult(team.team_id, highest_point_total))
    
    this_week.set_highest_points(team_results=highest_point_team)

def resolve_bench_points(week_number, this_week: Week, league: League):
    # Logic to resolve bench points for the week
    
    bench_points = []

    for boxScore in league.box_scores(week_number +1):
        
        if boxScore.home_team != 0:
            bench_points_home = sum(player.points for player in boxScore.home_lineup if (player.slot_position == 'BE' or player.slot_position == 'IR') )
            if(bench_points_home > boxScore.home_score):
                this_week.append_bench_over_starters(boxScore.home_team.team_id)
            bench_points.append(TeamResult(boxScore.home_team.team_id, round(bench_points_home,2)))
        
        if(boxScore.away_team != 0):
            bench_points_away = sum(player.points for player in boxScore.away_lineup if (player.slot_position == 'BE' or player.slot_position == 'IR') )
            if(bench_points_away > boxScore.away_score):
                this_week.append_bench_over_starters(boxScore.away_team.team_id)
            bench_points.append(TeamResult(boxScore.away_team.team_id, round(bench_points_away,2)))

    bench_points.sort(key=lambda tr: tr.points, reverse=True)
    print("Bench Points: ", bench_points)
    this_week.set_bench_points(team_results=bench_points)
    if bench_points:
        top_points = bench_points[0].points
        highest_bench_teams = [tr for tr in bench_points if tr.points == top_points]
        print(highest_bench_teams)
        this_week.set_highest_bench_points(team_results=highest_bench_teams)

def resolve_total_points(week_number, this_week: Week, last_week: Week, league: League):
    # Logic to resolve total points for the week

    total_points = []
    for team in league.teams:
        total_points.append(TeamResult(team.team_id, round(sum(team.scores[:week_number + 1]),2)))
    this_week.set_total_points(team_results=sorted(total_points, key=lambda tr: tr.points, reverse=True))



    


def resolve_team_names(week_number, this_week: Week, league: League):
    for boxScore in league.box_scores(week_number+1):
        if boxScore.home_team != 0:
            home_team_id = boxScore.home_team.team_id
            this_week.append_team_name(str(home_team_id), boxScore.home_team.team_name)     
        if boxScore.away_team != 0:
            away_team_id = boxScore.away_team.team_id
            this_week.append_team_name(str(away_team_id), boxScore.away_team.team_name)

def main():
    league = League(league_id=1173078, year=season_year, espn_s2=ESPN_S2,swid=ESPN_SWID)
    #week_number = league.current_week
    week_number = 1

    # Example: Connect to Firestore
    db = get_firestore_client()
    print('Connected to Firestore:', db)

    this_year = Year(season_year, db)
    
    last_week = this_year.get_last_week(week_number)
    this_week = Week(last_week)

    resolve_highest_points(week_number, this_week, league)
    resolve_bench_points(week_number, this_week, league)
    resolve_team_names(week_number, this_week, league)
    resolve_total_points(week_number, this_week, last_week, league)

    print(this_week.to_dict())
    doc_ref = db.collection("data").document(str(season_year))
    doc_ref.set({"week."+ str(week_number): this_week.to_dict()},merge=True)

if __name__ == "__main__":
    main()
