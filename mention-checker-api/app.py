"""
Flask API: given an X/Twitter account, returns how many of its tweets mention
our page (TARGET_PAGE). Uses twscrape against the account's timeline, since
X's search endpoint unreliably indexes low-follower accounts.

ENDPOINT
  GET /mentions/<username>?limit=100

SETUP
  pip install -r requirements.txt
  cp .env.example .env   # fill in TWITTER_AUTH_TOKEN, TWITTER_CT0, TARGET_PAGE

RUN (dev)
  python app.py

RUN (pm2)
  pm2 start ecosystem.config.js
"""

import asyncio
import os

from dotenv import load_dotenv
from flask import Flask, jsonify
from twscrape import API

load_dotenv()

TWITTER_AUTH_TOKEN = os.environ["TWITTER_AUTH_TOKEN"]
TWITTER_CT0 = os.environ["TWITTER_CT0"]
TARGET_PAGE = os.environ.get("TARGET_PAGE", "Telegraphprotoc")
ACCOUNT_NAME = "mention_checker_account"
DEFAULT_LIMIT = 100

app = Flask(__name__)
api = API()


def run_async(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


async def ensure_account() -> None:
    accounts = await api.pool.accounts_info()
    if not any(a["username"] == ACCOUNT_NAME for a in accounts):
        await api.pool.add_account(
            ACCOUNT_NAME,
            password="unused",
            email="unused@example.com",
            email_password="unused",
            cookies=f"auth_token={TWITTER_AUTH_TOKEN}; ct0={TWITTER_CT0}",
        )
    await api.pool.login_all()


async def count_mentions(username: str, limit: int):
    user = await api.user_by_login(username)
    if user is None:
        return None

    tweets = []
    async for tweet in api.user_tweets(user.id, limit=limit):
        tweets.append(tweet)

    mentions = [t for t in tweets if TARGET_PAGE.lower() in t.rawContent.lower()]

    return {
        "account": username,
        "targetPage": TARGET_PAGE,
        "tweetsScanned": len(tweets),
        "mentionCount": len(mentions),
        "mentions": [
            {"date": t.date.isoformat(), "text": t.rawContent, "url": t.url}
            for t in mentions
        ],
    }


run_async(ensure_account())


@app.route("/mentions/<username>")
def mentions(username: str):
    limit = int(os.environ.get("SCAN_LIMIT", DEFAULT_LIMIT))
    result = run_async(count_mentions(username, limit))
    if result is None:
        return jsonify({"error": f"X account '{username}' not found"}), 404
    return jsonify(result)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 3100)))
