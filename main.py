
from config_secrets import ESPN_SWID, ESPN_S2
from espn_api.football import League

def main():
    league = League(league_id=1173078, year=2024, espn_swid=ESPN_SWID, espn_s2=ESPN_S2)
    print(league)

if __name__ == "__main__":
    main()
