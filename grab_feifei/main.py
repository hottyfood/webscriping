import random
import time
from datetime import datetime, time as dtime, timedelta
from zoneinfo import ZoneInfo

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By


PROFILE_PATH = r"C:\selenium_profiles\grab_feifei"
TARGET_URL = "https://octopus.energy/dashboard/new/accounts/A-CCA3F37C/octoplus/partner/offer-group/925"
OFFER_TITLE = "A hot or cold drink on us - any size, every week"

UK_TZ = ZoneInfo("Europe/London")

ACTIVE_START = dtime(5, 0)
STOP_TIME = dtime(7, 0)

IDLE_REFRESH_SECONDS = 60 * 60
ACTIVE_BASE_SECONDS = 5 * 60
ACTIVE_RANDOM_SECONDS = 60


def next_datetime(target_time):
    now = datetime.now(UK_TZ)
    target = datetime.combine(now.date(), target_time, tzinfo=UK_TZ)
    if now >= target:
        target += timedelta(days=1)
    return target


active_start_dt = next_datetime(ACTIVE_START)
stop_dt = datetime.combine(active_start_dt.date(), STOP_TIME, tzinfo=UK_TZ)

options = Options()
options.add_argument(f"--user-data-dir={PROFILE_PATH}")
options.add_argument("--start-maximized")

driver = webdriver.Chrome(options=options)

try:
    driver.get(TARGET_URL)

    while True:
        now = datetime.now(UK_TZ)

        if now >= stop_dt:
            print(f"[{now:%Y-%m-%d %H:%M:%S %Z}] Reached 07:00 cutoff. Stopping.")
            break

        print(f"[{now:%Y-%m-%d %H:%M:%S %Z}] Refreshing page...")
        driver.refresh()
        time.sleep(3)

        try:
            card = driver.find_element(
                By.XPATH,
                f"//h3[normalize-space()='{OFFER_TITLE}']"
                "/ancestor::div[.//button[@data-part='button-root']][1]"
            )
            button = card.find_element(By.XPATH, ".//button[@data-part='button-root']")

            if button.is_enabled() and not button.get_attribute("disabled"):
                print(f"[{datetime.now(UK_TZ):%Y-%m-%d %H:%M:%S %Z}] Button available. Clicking.")
                button.click()
                break

            print("Still disabled.")

        except Exception as e:
            print(f"Check failed: {e}")

        if now >= active_start_dt:
            sleep_seconds = ACTIVE_BASE_SECONDS + random.uniform(
                -ACTIVE_RANDOM_SECONDS,
                ACTIVE_RANDOM_SECONDS,
            )
            print(f"Active mode. Next check in {sleep_seconds:.1f} seconds.")
        else:
            sleep_seconds = min(IDLE_REFRESH_SECONDS, (active_start_dt - now).total_seconds())
            print(f"Idle mode. Next check in {sleep_seconds:.1f} seconds.")

        time.sleep(max(30, sleep_seconds))

except KeyboardInterrupt:
    print("Stopped manually.")

finally:
    driver.quit()