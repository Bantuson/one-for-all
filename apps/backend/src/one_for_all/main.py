from one_for_all.crew import OneForAllCrew
from one_for_all.tools.otp_store import cleanup_expired_otps

def run():
    # Clean up expired OTPs before starting crew
    print("Cleaning up expired OTP codes...")
    deleted_count = cleanup_expired_otps()
    if deleted_count > 0:
        print(f"Removed {deleted_count} expired OTP records")
    else:
        print("No expired OTP codes to clean up")

    crew_builder = OneForAllCrew()
    crew = crew_builder.crew()
    result = crew.kickoff()

    print("\n====================")
    print(" FINAL CREW OUTPUT ")
    print("====================\n")
    print(result)

if __name__ == "__main__":
    run()
