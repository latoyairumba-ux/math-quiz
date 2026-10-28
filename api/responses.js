
module.exports = async function handler(req, res) {
    // Only accept POST requests.
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");

        return res.status(405).json({
            error: "Method not allowed."
        });
    }

    // Read the Supabase settings from Vercel.
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        return res.status(500).json({
            error: "Database environment variables are not configured."
        });
    }

    // Read the results sent by index.html.
    const body = req.body || {};

    const {
        participantId,
        logScore,
        linearScore,
        totalQuestions
    } = body;

    // Validate the participant ID.
    if (
        typeof participantId !== "string" ||
        participantId.length < 1 ||
        participantId.length > 100
    ) {
        return res.status(400).json({
            error: "Invalid participant ID."
        });
    }

    // Validate both scores and the total.
    if (
        !Number.isInteger(logScore) ||
        logScore < 0 ||
        logScore > 5 ||

        !Number.isInteger(linearScore) ||
        linearScore < 0 ||
        linearScore > 5 ||

        !Number.isInteger(totalQuestions) ||
        totalQuestions !== 10
    ) {
        return res.status(400).json({
            error: "Invalid quiz results."
        });
    }

    // These column names match your existing database table.
    const row = {
        participant_id: participantId,
        log_score: logScore,
        linear_score: linearScore,
        total_questions: totalQuestions
    };

    try {
        // Insert the results into Supabase.
        const databaseResponse = await fetch(
            `${supabaseUrl.replace(/\/+$/, "")}/rest/v1/quiz_responses`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "apikey": serviceRoleKey,
                    "Authorization": `Bearer ${serviceRoleKey}`,
                    "Prefer": "return=minimal"
                },

                body: JSON.stringify(row)
            }
        );

        if (!databaseResponse.ok) {
            const detail = await databaseResponse.text();

            console.error(
                "Supabase insert failed:",
                databaseResponse.status,
                detail
            );

            return res.status(502).json({
                error: "The database did not accept the results."
            });
        }

        return res.status(200).json({
            saved: true,
            participantId: participantId
        });

    } catch (error) {
        console.error(
            "Unable to contact Supabase:",
            error
        );

        return res.status(502).json({
            error: "Unable to contact the database."
        });
    }
};
