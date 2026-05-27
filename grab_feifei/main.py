import random
import time
from datetime import datetime, time as dtime, timedelta
from zoneinfo import ZoneInfo

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


PROFILE_PATH = r"C:\selenium_profiles\grab_feifei"
TARGET_URL = "https://octopus.energy/dashboard/new/accounts/A-CCA3F37C/octoplus/partner/offer-group/925"

OFFER_TITLE = "A hot or cold drink on us - any size, every week"

UK_TZ = ZoneInfo("Europe/London")

ACTIVE_START = dtime(5, 0)
STOP_TIME = dtime(7, 0)

IDLE_REFRESH_SECONDS = 60 * 60
ACTIVE_BASE_SECONDS = 5 * 60
ACTIVE_RANDOM_SECONDS = 60


def now_uk():
    return datetime.now(UK_TZ)


def next_datetime(target_time):
    now = now_uk()
    target = datetime.combine(now.date(), target_time, tzinfo=UK_TZ)
    return target if now < target else target + timedelta(days=1)


active_start_dt = next_datetime(ACTIVE_START)
stop_dt = datetime.combine(active_start_dt.date(), STOP_TIME, tzinfo=UK_TZ)

options = Options()
options.add_argument(f"--user-data-dir={PROFILE_PATH}")
options.add_argument("--start-maximized")

driver = webdriver.Chrome(options=options)

try:
    driver.get(TARGET_URL)

    while True:
        now = now_uk()

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
                "/ancestor::div[@data-testid='offer-card'][1]"
            )

            target = card.find_element(By.XPATH, ".//*[@data-part='button-root']")
            tag_name = target.tag_name.lower()
            href = target.get_attribute("href")
            disabled = target.get_attribute("disabled")

            if tag_name == "a" and href:
                print(f"[{now_uk():%Y-%m-%d %H:%M:%S %Z}] Offer available. Clicking Reveal offer.")
                target.click()

                activate_button = WebDriverWait(driver, 20).until(
                    EC.element_to_be_clickable(
                        (
                            By.XPATH,
                            "//button[@data-part='button-root' "
                            "and .//span[normalize-space()='Activate offer']]",
                        )
                    )
                )

                print(f"[{now_uk():%Y-%m-%d %H:%M:%S %Z}] Clicking Activate offer.")
                activate_button.click()
                break

            if tag_name == "button" and not disabled and target.is_enabled():
                print(f"[{now_uk():%Y-%m-%d %H:%M:%S %Z}] Button available. Clicking.")
                target.click()
                break

            print("Still disabled.")

        except Exception as e:
            print(f"Check failed: {e}")

        now = now_uk()

        if now >= active_start_dt:
            sleep_seconds = ACTIVE_BASE_SECONDS + random.uniform(
                -ACTIVE_RANDOM_SECONDS,
                ACTIVE_RANDOM_SECONDS,
            )
            print(f"Active mode. Next check in {sleep_seconds:.1f} seconds.")
        else:
            sleep_seconds = min(
                IDLE_REFRESH_SECONDS,
                (active_start_dt - now).total_seconds(),
            )
            print(f"Idle mode. Next check in {sleep_seconds:.1f} seconds.")

        time.sleep(max(30, sleep_seconds))

except KeyboardInterrupt:
    print("Stopped manually.")

finally:
    driver.quit()