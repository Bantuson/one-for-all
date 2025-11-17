from one_for_all.crew import OneForAllCrew

def run():
    crew_builder = OneForAllCrew()
    crew = crew_builder.crew()
    result = crew.kickoff()
    
    print("\n====================")
    print(" FINAL CREW OUTPUT ")
    print("====================\n")
    print(result)

if __name__ == "__main__":
    run()
